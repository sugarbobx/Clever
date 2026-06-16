import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/server/prisma";
import { env } from "@/server/env";
import { enqueueOcr } from "@/server/queue";
import { sendWhatsAppMessage } from "@/server/whatsapp";
import { DOCUMENT_SOURCES, DOCUMENT_STATUS, SUBSCRIPTION_TIERS } from "@/server/enums";

// Public route (Meta callback) — intentionally NOT behind requireAuth.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET — Meta webhook verification handshake.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// POST — inbound messages. Validates the signature (when configured), responds
// 200 to Meta immediately, then processes asynchronously.
export async function POST(req: Request) {
  const raw = await req.text();

  if (env.WHATSAPP_APP_SECRET) {
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const expected = "sha256=" + crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(raw).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  void handleInbound(body).catch((err) => console.error("[whatsapp webhook] error", err));
  return NextResponse.json({ received: true }, { status: 200 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleInbound(body: any) {
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  const from: string = message.from;
  const messageId: string | undefined = message.id;

  // Idempotency: Meta retries deliveries — skip an already-ingested message.
  if (messageId) {
    const seen = await prisma.document.findUnique({ where: { waMessageId: messageId } });
    if (seen) return;
  }

  const client = await prisma.clientAccount.findFirst({ where: { phone: from, deletedAt: null } });
  if (!client) {
    await sendWhatsAppMessage(from, "❌ Votre numéro n'est pas enregistré dans notre système. Contactez votre comptable.");
    return;
  }

  if (client.subscriptionTier === SUBSCRIPTION_TIERS.DECLARANT_SOLO && client.documentCount >= 30) {
    await sendWhatsAppMessage(
      from,
      "⚠️ Vous avez atteint votre limite de 30 documents ce mois.\n\nPour continuer, passez au plan Comptable Pro (59 900 XAF/mois).\nContactez votre conseiller CLEVER."
    );
    return;
  }

  let mediaId: string | null = null;
  let mimeType = "image/jpeg";
  if (message.type === "image") {
    mediaId = message.image?.id ?? null;
    mimeType = message.image?.mime_type || "image/jpeg";
  } else if (message.type === "document") {
    mediaId = message.document?.id ?? null;
    mimeType = message.document?.mime_type || "application/pdf";
  } else {
    await sendWhatsAppMessage(from, "📎 Envoyez une photo ou un PDF de votre reçu ou facture.");
    return;
  }

  const document = await prisma.document.create({
    data: {
      clientId: client.id,
      source: DOCUMENT_SOURCES.WHATSAPP,
      status: DOCUMENT_STATUS.PENDING_OCR,
      filePath: "",
      fileName: `wa_${messageId ?? Date.now()}`,
      mimeType,
      fileSize: 0,
      waMessageId: messageId ?? `wamid.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      waPhoneNumber: from,
    },
  });

  await prisma.clientAccount.update({ where: { id: client.id }, data: { documentCount: { increment: 1 } } });

  await enqueueOcr({ documentId: document.id, mediaId, clientId: client.id, waPhoneNumber: from });

  await sendWhatsAppMessage(
    from,
    "⏳ Document reçu ! Traitement en cours...\nVous recevrez une confirmation dans quelques secondes."
  );
}
