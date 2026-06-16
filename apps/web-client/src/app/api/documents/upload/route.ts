import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { enforceDocumentLimit } from "@/server/subscription";
import { saveUpload } from "@/server/upload";
import { audit } from "@/server/audit";
import { emitQueueChanged } from "@/server/events";
import { extract } from "@/server/mockOcr";
import { handle, ApiError } from "@/server/http";
import { DOCUMENT_SOURCES, DOCUMENT_STATUS } from "@/server/enums";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pendingCount(): Promise<number> {
  return prisma.document.count({ where: { status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null } });
}

// POST /api/documents/upload — client portal upload (counts toward tier limit)
export const POST = handle(async (req: Request) => {
  const user = await requireAuth(req);
  const account = await enforceDocumentLimit(user);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Fichier manquant.");

  const saved = await saveUpload(file);
  const description = (form.get("description") as string) || undefined;
  const vendor = (form.get("vendor") as string) || undefined;
  const ocr = extract({ description, vendor, country: account.country });

  const doc = await prisma.document.create({
    data: {
      clientId: account.id,
      uploadedById: user.sub,
      source: DOCUMENT_SOURCES.PORTAL,
      status: DOCUMENT_STATUS.PENDING_VALIDATION,
      filePath: saved.filename,
      fileName: saved.originalName,
      mimeType: saved.mimeType,
      fileSize: saved.size,
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
  });

  await prisma.clientAccount.update({
    where: { id: account.id },
    data: { documentCount: { increment: 1 } },
  });
  await audit({
    actorId: user.sub,
    actorName: user.name,
    action: "DOCUMENT_UPLOADED",
    entity: "Document",
    entityId: doc.id,
    detail: `${doc.vendor} — ${doc.amount} ${doc.currency}`,
  });
  emitQueueChanged(await pendingCount());
  return NextResponse.json({ document: doc }, { status: 201 });
});
