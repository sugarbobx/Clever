import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { audit } from "@/server/audit";
import { emitQueueChanged } from "@/server/events";
import { extract } from "@/server/mockOcr";
import { ROLES, DOCUMENT_SOURCES, DOCUMENT_STATUS } from "@/server/enums";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  clientId: z.string().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().optional(),
});

/**
 * POST /api/demo/simulate-receipt
 * DEMO stand-in for the WhatsApp ingestion webhook. Creates a PENDING_VALIDATION
 * document with mock-OCR fields. Staff only (it's a demo trigger).
 */
export const POST = handle(async (req: Request) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE, ROLES.TRAINEE, ROLES.HR);

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body ?? {});
  const input = parsed.success ? parsed.data : {};

  // Pick the target client: provided, else a random active one.
  let client = input.clientId
    ? await prisma.clientAccount.findUnique({ where: { id: input.clientId } })
    : null;
  if (!client) {
    const clients = await prisma.clientAccount.findMany({ where: { deletedAt: null }, take: 20 });
    if (!clients.length) throw new ApiError(400, "Aucun client disponible.");
    client = clients[Math.floor(Math.random() * clients.length)];
  }

  const ocr = extract({
    vendor: input.vendor,
    description: input.description,
    amount: input.amount,
    country: client.country,
  });

  const doc = await prisma.document.create({
    data: {
      clientId: client.id,
      source: DOCUMENT_SOURCES.WHATSAPP,
      status: DOCUMENT_STATUS.PENDING_VALIDATION,
      filePath: "demo-receipt.png",
      fileName: "recu-whatsapp.png",
      mimeType: "image/png",
      fileSize: 84211,
      waMessageId: `wamid.${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      waPhoneNumber: client.phone ?? "+237600000000",
      vendor: ocr.vendor,
      amount: ocr.amount,
      currency: ocr.currency,
      date: new Date(ocr.date),
      vatAmount: ocr.vatAmount,
      vatRate: ocr.vatRate,
      description: ocr.description,
      sysohadaCode: ocr.sysohadaCode,
      sysohadaLabel: ocr.sysohadaLabel,
      ocrConfidence: ocr.confidence,
      needsReview: ocr.needsReview,
    },
    include: { client: { select: { name: true } } },
  });

  await audit({
    actorId: user.sub,
    actorName: user.name,
    action: "WHATSAPP_RECEIPT_SIMULATED",
    entity: "Document",
    entityId: doc.id,
    detail: `${doc.vendor} — ${doc.amount} ${doc.currency} (démo)`,
  });
  emitQueueChanged(
    await prisma.document.count({ where: { status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null } })
  );
  return NextResponse.json({ document: doc, demo: true }, { status: 201 });
});
