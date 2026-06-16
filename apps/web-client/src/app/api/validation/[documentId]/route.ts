import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { audit } from "@/server/audit";
import { emitQueueChanged } from "@/server/events";
import { sendWhatsAppMessage } from "@/server/whatsapp";
import { isValidSysohadaCode, getAccount } from "@clever/fiscal-engine";
import { executePush } from "@/server/qboPushWorker";
import { VALIDATOR_ROLES, DOCUMENT_STATUS, VALIDATION_ACTIONS } from "@/server/enums";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum([VALIDATION_ACTIONS.APPROVED, VALIDATION_ACTIONS.REJECTED, VALIDATION_ACTIONS.EDITED]),
  notes: z.string().optional(),
  finalAmount: z.number().optional(),
  finalCode: z.string().optional(),
});

function pendingCount(): Promise<number> {
  return prisma.document.count({ where: { status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null } });
}

/**
 * PUT /api/validation/:documentId
 * Approve / edit-and-approve / reject a document. EMPLOYEE + MANAGER only
 * (TRAINEE is draft-only and is intentionally excluded).
 */
export const PUT = handle(async (req: Request, { params }: { params: Promise<{ documentId: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ...VALIDATOR_ROLES);
  const { documentId } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Données invalides.");
  const { action, notes, finalAmount, finalCode } = parsed.data;

  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    include: { client: { include: { qboConnection: true } } },
  });
  if (!doc) throw new ApiError(404, "Document introuvable.");

  if (finalCode && !isValidSysohadaCode(finalCode)) {
    throw new ApiError(400, "Code SYSCOHADA invalide.");
  }
  if (action === VALIDATION_ACTIONS.REJECTED && !notes) {
    throw new ApiError(400, "Un motif de rejet est requis.");
  }

  // Record the validation
  const validation = await prisma.validation.upsert({
    where: { documentId: doc.id },
    create: { documentId: doc.id, validatedById: user.sub, action, notes, finalAmount, finalCode },
    update: { validatedById: user.sub, action, notes, finalAmount, finalCode },
  });

  if (action === VALIDATION_ACTIONS.REJECTED) {
    await prisma.document.update({ where: { id: doc.id }, data: { status: DOCUMENT_STATUS.REJECTED } });
    await audit({
      actorId: user.sub,
      actorName: user.name,
      action: "VALIDATION_REJECTED",
      entity: "Document",
      entityId: doc.id,
      detail: notes,
    });
    if (doc.waPhoneNumber) {
      await sendWhatsAppMessage(
        doc.waPhoneNumber,
        `❌ Votre document a été rejeté.\nMotif : ${notes}\n\nVeuillez renvoyer un document lisible.`
      );
    }
    emitQueueChanged(await pendingCount());
    return NextResponse.json({ validation, status: DOCUMENT_STATUS.REJECTED });
  }

  // APPROVED or EDITED → push to QuickBooks (real or mock) → PUSHED_TO_QBO / QBO_ERROR
  const effectiveCode = finalCode ?? doc.sysohadaCode ?? "6043";
  const account = getAccount(effectiveCode);
  const push = await executePush(doc, { effectiveCode, finalAmount });
  const finalStatus = push.ok ? DOCUMENT_STATUS.PUSHED_TO_QBO : DOCUMENT_STATUS.QBO_ERROR;

  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      status: finalStatus,
      sysohadaCode: effectiveCode,
      sysohadaLabel: account?.label ?? doc.sysohadaLabel,
      amount: finalAmount ?? doc.amount,
      needsReview: false,
    },
  });

  await audit({
    actorId: user.sub,
    actorName: user.name,
    action: push.ok ? "VALIDATION_APPROVED" : "VALIDATION_QBO_ERROR",
    entity: "Document",
    entityId: doc.id,
    detail: push.ok
      ? `→ QBO ${push.id} | SYSCOHADA ${effectiveCode}${push.demo ? " (démo)" : ""}`
      : `Échec synchronisation QBO | SYSCOHADA ${effectiveCode}`,
  });
  if (push.ok && doc.waPhoneNumber) {
    await sendWhatsAppMessage(
      doc.waPhoneNumber,
      `✅ Document validé et enregistré !\n\n` +
        `Vendeur : ${doc.vendor}\n` +
        `Montant : ${(finalAmount ?? doc.amount ?? 0).toLocaleString("fr-FR")} ${doc.currency ?? "XAF"}\n` +
        `Compte : ${effectiveCode} — ${account?.label ?? doc.sysohadaLabel}\n` +
        `Référence CLEVER : #${doc.id.slice(0, 8).toUpperCase()}`
    );
  }
  emitQueueChanged(await pendingCount());

  return NextResponse.json({
    validation,
    status: finalStatus,
    qbo: { demo: push.demo, id: push.id, ok: push.ok },
    document: updated,
  });
});
