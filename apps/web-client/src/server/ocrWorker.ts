/**
 * OCR worker logic (Phase 2). Runs the receipt-extraction step for a document
 * created by the WhatsApp webhook:
 *   - real path: download the Meta media → Claude Haiku → structured JSON,
 *   - mock path (no ANTHROPIC_API_KEY / no media): reuse the existing mockOcr,
 *     which still derives the SYSCOHADA code from the real fiscal-engine.
 * It is invoked either by the Bull queue or inline (see queue.ts).
 */
import fs from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import { prisma } from "./prisma";
import { env, anthropicConfigured } from "./env";
import { sendWhatsAppMessage } from "./whatsapp";
import { extract, type OcrExtraction } from "./mockOcr";
import { emitQueueChanged } from "./events";
import { DOCUMENT_STATUS } from "./enums";
import { UPLOAD_DIR_ABS } from "./upload";

export interface OcrJob {
  documentId: string;
  mediaId?: string | null;
  clientId: string;
  waPhoneNumber: string;
}

const GRAPH = `https://graph.facebook.com/${env.GRAPH_API_VERSION}`;

const SYSTEM_PROMPT = `Tu es un assistant comptable spécialisé en comptabilité francophone africaine selon le plan SYSCOHADA RÉVISÉ (OHADA).

Extrait les données structurées du document financier et retourne UNIQUEMENT un JSON valide. Aucun texte avant ou après.

Schéma requis :
{
  "vendor": string,
  "amount": number,
  "currency": "XAF"|"EUR"|"USD"|string,
  "date": "YYYY-MM-DD",
  "vat_amount": number|null,
  "vat_rate": number|null,
  "description": string,
  "syscohada_code": string,
  "syscohada_label": string,
  "confidence": number,
  "needs_review": boolean
}

Règles SYSCOHADA prioritaires :
- Carburant/transport : 6251
- Fournitures bureau : 6043
- Télécom/internet : 626
- Repas/restaurant : 6253
- Services bancaires : 627
- Matériel informatique : 6065
- Si incertain (confidence < 0.7) : needs_review = true`;

async function notifyQueue() {
  emitQueueChanged(
    await prisma.document.count({ where: { status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null } })
  );
}

/** Download the Meta media, persist it, and run Claude Haiku extraction. */
async function realOcr(doc: { id: string; mimeType: string }, mediaId: string): Promise<OcrExtraction> {
  // 1. Resolve the CDN URL then download the bytes (both need the Meta token).
  const meta = await axios.get(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });
  const bin = await axios.get(meta.data.url, {
    responseType: "arraybuffer",
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });
  const buf = Buffer.from(bin.data as ArrayBuffer);

  // 2. Persist to the local upload dir (served by /api/documents/:id/file).
  await fs.mkdir(UPLOAD_DIR_ABS, { recursive: true });
  const isPdf = doc.mimeType.includes("pdf");
  const fileName = `${doc.id}${isPdf ? ".pdf" : ".jpg"}`;
  await fs.writeFile(path.join(UPLOAD_DIR_ABS, fileName), buf);
  await prisma.document.update({
    where: { id: doc.id },
    data: { filePath: fileName, fileName, fileSize: buf.byteLength },
  });

  // 3. Claude Haiku. The SDK is dynamically imported so it never loads at build.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const data = buf.toString("base64");
  const source = isPdf
    ? { type: "base64" as const, media_type: "application/pdf" as const, data }
    : { type: "base64" as const, media_type: "image/jpeg" as const, data };
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [
          { type: isPdf ? "document" : "image", source } as any,
          { type: "text", text: "Extrait les données de ce document financier." },
        ],
      },
    ],
  });

  const block = response.content[0];
  const raw = block && block.type === "text" ? block.text : "";
  const j = JSON.parse(raw.replace(/```json|```/g, "").trim());
  return {
    vendor: j.vendor,
    amount: Number(j.amount),
    currency: j.currency ?? "XAF",
    date: j.date,
    vatAmount: j.vat_amount ?? null,
    vatRate: j.vat_rate ?? null,
    description: j.description,
    sysohadaCode: j.syscohada_code,
    sysohadaLabel: j.syscohada_label,
    confidence: Number(j.confidence ?? 0),
    needsReview: Boolean(j.needs_review),
  };
}

export async function processReceipt(job: OcrJob): Promise<void> {
  const { documentId, mediaId, waPhoneNumber } = job;
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error("Document introuvable");

    const useReal = anthropicConfigured && Boolean(env.WHATSAPP_TOKEN) && Boolean(mediaId);
    let ocr: OcrExtraction;
    if (useReal) {
      ocr = await realOcr(doc, mediaId as string);
    } else {
      const client = await prisma.clientAccount.findUnique({ where: { id: doc.clientId } });
      ocr = extract({ country: client?.country ?? "CM" });
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DOCUMENT_STATUS.PENDING_VALIDATION,
        vendor: ocr.vendor,
        amount: ocr.amount,
        currency: ocr.currency ?? "XAF",
        date: ocr.date ? new Date(ocr.date) : null,
        vatAmount: ocr.vatAmount,
        vatRate: ocr.vatRate,
        description: ocr.description,
        sysohadaCode: ocr.sysohadaCode,
        sysohadaLabel: ocr.sysohadaLabel,
        ocrConfidence: ocr.confidence,
        needsReview: ocr.needsReview || (ocr.confidence ?? 0) < 0.7,
      },
    });

    const conf = Math.round((ocr.confidence ?? 0) * 100);
    await sendWhatsAppMessage(
      waPhoneNumber,
      `✅ Document analysé !\n\n` +
        `Vendeur : ${ocr.vendor ?? "Non détecté"}\n` +
        `Montant : ${ocr.amount ? ocr.amount.toLocaleString("fr-FR") : "?"} ${ocr.currency ?? "XAF"}\n` +
        `Date : ${ocr.date ?? "Non détectée"}\n` +
        `Compte SYSCOHADA : ${ocr.sysohadaCode} — ${ocr.sysohadaLabel}\n` +
        `Confiance IA : ${conf}%\n\n` +
        `⏳ En attente de validation par votre comptable.`
    );

    await notifyQueue();
  } catch (err) {
    console.error("[ocr] échec — document basculé en révision manuelle", err);
    await prisma.document
      .update({ where: { id: documentId }, data: { status: DOCUMENT_STATUS.PENDING_VALIDATION, needsReview: true } })
      .catch(() => {});
    await sendWhatsAppMessage(
      waPhoneNumber,
      "⚠️ Nous avons reçu votre document mais l'analyse automatique a rencontré un problème. Votre comptable le traitera manuellement."
    ).catch(() => {});
    await notifyQueue().catch(() => {});
  }
}
