import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { CLIENT_ROLES, DOCUMENT_STATUS } from "@/server/enums";

export const dynamic = "force-dynamic";

type DeadlineLevel = "red" | "amber" | "blue";

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function nextDay(day: number, from = new Date()) {
  const candidate = new Date(from.getFullYear(), from.getMonth(), day);
  return candidate >= new Date(from.toDateString()) ? candidate : addMonths(candidate, 1);
}

function daysLeft(dueDate: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
}

function levelFor(days: number): DeadlineLevel {
  if (days <= 7) return "red";
  if (days <= 20) return "amber";
  return "blue";
}

function previousMonthLabel() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// GET /api/tax/compliance - fiscal calendar + compliance assistant for the logged-in client.
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  if (!CLIENT_ROLES.includes(user.role)) throw new ApiError(403, "Acces reserve aux clients.");
  if (!user.clientAccountId) throw new ApiError(400, "Aucun compte client rattache.");

  const [client, docs, rejected, pendingValidation] = await Promise.all([
    prisma.clientAccount.findUnique({
      where: { id: user.clientAccountId },
      select: { id: true, type: true, subscriptionTier: true, documentCount: true },
    }),
    prisma.document.findMany({
      where: { clientId: user.clientAccountId, deletedAt: null },
      select: { status: true, needsReview: true, ocrConfidence: true, vatAmount: true, date: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.document.count({
      where: { clientId: user.clientAccountId, status: DOCUMENT_STATUS.REJECTED, deletedAt: null },
    }),
    prisma.document.count({
      where: { clientId: user.clientAccountId, status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null },
    }),
  ]);

  if (!client) throw new ApiError(404, "Compte client introuvable.");

  const prevMonth = previousMonthLabel();
  const isCompany = client.type === "COMPANY";
  const baseDeadlines = [
    { id: "tva", label: `Declaration TVA ${prevMonth}`, dueDate: nextDay(15), obligation: "TVA", applies: isCompany },
    { id: "cnps", label: `Cotisations CNPS ${prevMonth}`, dueDate: nextDay(15), obligation: "CNPS", applies: isCompany },
    { id: "ras", label: `Retenues a la source ${prevMonth}`, dueDate: nextDay(15), obligation: "Retenues", applies: isCompany },
    { id: "irpp", label: "Declaration IRPP annuelle", dueDate: new Date(new Date().getFullYear() + 1, 2, 15), obligation: "IRPP", applies: !isCompany },
    { id: "patente", label: "Patente / impot liberatoire", dueDate: addMonths(nextDay(15), 1), obligation: "Patente", applies: true },
    { id: "dsf", label: "Preparation DSF annuelle", dueDate: new Date(new Date().getFullYear() + 1, 2, 15), obligation: "DSF", applies: isCompany },
  ].filter((item) => item.applies);

  const deadlines = baseDeadlines.map((item) => {
    const left = daysLeft(item.dueDate);
    return {
      id: item.id,
      label: item.label,
      obligation: item.obligation,
      dueDate: item.dueDate.toISOString(),
      daysLeft: left,
      level: levelFor(left),
      channels: ["WhatsApp", "Email"],
      demo: true,
    };
  });

  const incompleteDocs = docs.filter((doc) => doc.needsReview || (doc.ocrConfidence ?? 1) < 0.72).length;
  const missingVat = isCompany && docs.some((doc) => doc.vatAmount == null);
  const missingPieces = [
    pendingValidation > 0 ? `${pendingValidation} document(s) a valider` : null,
    incompleteDocs > 0 ? `${incompleteDocs} document(s) OCR a completer` : null,
    missingVat ? "Montants TVA manquants sur certaines pieces" : null,
    docs.length === 0 ? "Aucun justificatif transmis ce mois-ci" : null,
    isCompany ? "Balance generale mensuelle" : "Justificatifs de revenus annuels",
  ].filter(Boolean);

  const urgentDeadlines = deadlines.filter((d) => d.level === "red").length;
  const riskScore = Math.min(100, urgentDeadlines * 24 + incompleteDocs * 8 + rejected * 10 + pendingValidation * 5 + (docs.length === 0 ? 20 : 0));
  const riskLevel = riskScore >= 70 ? "CRITIQUE" : riskScore >= 40 ? "A_SURVEILLER" : "OK";

  const actions = [
    pendingValidation > 0 ? "Valider les pieces en attente avant la prochaine echeance." : "Verifier les nouvelles pieces des qu'elles arrivent.",
    incompleteDocs > 0 ? "Completer les champs OCR incertains: fournisseur, montant, TVA et date." : "Maintenir le classement comptable a jour.",
    isCompany ? "Preparer la TVA, CNPS et retenues a la source du mois precedent." : "Regrouper les justificatifs IRPP et revenus fonciers.",
  ];

  return NextResponse.json({
    clientType: client.type,
    regime: isCompany ? "Reel simplifie / normal (demo)" : "Particulier / impot liberatoire (demo)",
    deadlines,
    compliance: {
      score: Math.max(0, 100 - riskScore),
      riskScore,
      riskLevel,
      missingPieces,
      actions,
      summary:
        riskLevel === "CRITIQUE"
          ? "Dossier critique: traiter les echeances urgentes et les pieces incompletes."
          : riskLevel === "A_SURVEILLER"
            ? "Dossier a surveiller: quelques points bloquent la conformite."
            : "Dossier globalement conforme selon les donnees disponibles.",
    },
    demo: true,
  });
});
