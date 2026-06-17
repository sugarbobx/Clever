import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { CLIENT_ROLES, DOCUMENT_STATUS, STAFF_ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

function classLabel(code: string) {
  if (code.startsWith("1")) return "Capitaux et ressources durables";
  if (code.startsWith("2")) return "Actif immobilise";
  if (code.startsWith("3")) return "Stocks";
  if (code.startsWith("4")) return "Tiers";
  if (code.startsWith("5")) return "Tresorerie";
  if (code.startsWith("6")) return "Charges";
  if (code.startsWith("7")) return "Produits";
  return "Autres comptes";
}

function monthStart(year: number) {
  return new Date(year, 0, 1);
}

// GET /api/syscohada/dsf?clientId=...&year=2026
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const requestedClientId = url.searchParams.get("clientId");

  const clientId = STAFF_ROLES.includes(user.role)
    ? requestedClientId
    : CLIENT_ROLES.includes(user.role)
      ? user.clientAccountId
      : null;

  if (!clientId) throw new ApiError(400, "Client introuvable pour la preparation DSF.");

  const client = await prisma.clientAccount.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, type: true },
  });
  if (!client) throw new ApiError(404, "Client introuvable.");

  const docs = await prisma.document.findMany({
    where: {
      clientId,
      deletedAt: null,
      createdAt: { gte: monthStart(year), lt: monthStart(year + 1) },
      status: { not: DOCUMENT_STATUS.REJECTED },
      sysohadaCode: { not: null },
      amount: { not: null },
    },
    select: {
      sysohadaCode: true,
      sysohadaLabel: true,
      amount: true,
      vatAmount: true,
      status: true,
      needsReview: true,
      ocrConfidence: true,
    },
  });

  const accounts = new Map<string, { code: string; label: string; className: string; debit: number; credit: number; balance: number; demo: boolean }>();
  for (const doc of docs) {
    const code = doc.sysohadaCode!;
    const isProduct = code.startsWith("7");
    const current = accounts.get(code) ?? {
      code,
      label: doc.sysohadaLabel ?? classLabel(code),
      className: classLabel(code),
      debit: 0,
      credit: 0,
      balance: 0,
      demo: false,
    };
    if (isProduct) current.credit += doc.amount ?? 0;
    else current.debit += doc.amount ?? 0;
    current.balance = current.debit - current.credit;
    accounts.set(code, current);
  }

  const realCharges = [...accounts.values()].filter((a) => a.code.startsWith("6")).reduce((sum, a) => sum + a.debit, 0);
  const realProducts = [...accounts.values()].filter((a) => a.code.startsWith("7")).reduce((sum, a) => sum + a.credit, 0);
  const estimatedProducts = realProducts || Math.max(realCharges * 1.35, docs.length * 250_000);
  const result = estimatedProducts - realCharges;
  const vatRecoverable = docs.reduce((sum, d) => sum + (d.vatAmount ?? 0), 0);
  const pendingReview = docs.filter((d) => d.needsReview || (d.ocrConfidence ?? 1) < 0.7).length;
  const approvedDocs = docs.filter((d) => d.status === DOCUMENT_STATUS.APPROVED || d.status === DOCUMENT_STATUS.PUSHED_TO_QBO).length;
  const readiness = Math.max(0, Math.min(100, 35 + (docs.length > 0 ? 20 : 0) + (approvedDocs > 0 ? 25 : 0) - pendingReview * 8));

  const balance = [...accounts.values()].sort((a, b) => a.code.localeCompare(b.code));
  const statements = {
    incomeStatement: {
      products: estimatedProducts,
      productsDemo: realProducts === 0,
      charges: realCharges,
      operatingResult: result,
    },
    balanceSheet: {
      assets: [
        { label: "Tresorerie estimee", amount: Math.max(0, result + vatRecoverable), demo: true },
        { label: "TVA recuperable", amount: vatRecoverable, demo: false },
      ],
      liabilities: [
        { label: "Fournisseurs et dettes d'exploitation", amount: realCharges, demo: true },
        { label: "Resultat de l'exercice", amount: result, demo: realProducts === 0 },
      ],
    },
    cashFlow: {
      operatingCashFlow: result + vatRecoverable,
      investingCashFlow: 0,
      financingCashFlow: 0,
      demo: true,
    },
    annexes: [
      `${docs.length} piece(s) comptable(s) exploitees pour ${year}.`,
      pendingReview > 0 ? `${pendingReview} piece(s) demandent une validation humaine avant depot.` : "Aucune anomalie OCR majeure detectee.",
      realProducts === 0 ? "Produits estimes en demo: aucune facture client classee en classe 7." : "Produits issus des documents classes en classe 7.",
    ],
  };

  return NextResponse.json({
    client: { id: client.id, name: client.name, type: client.type },
    year,
    readiness,
    status: readiness >= 80 ? "PRET" : readiness >= 50 ? "A_COMPLETER" : "BROUILLON",
    balance,
    statements,
    checklist: [
      { label: "Balance generale", done: balance.length > 0, demo: false },
      { label: "Grand livre", done: docs.length > 0, demo: false },
      { label: "Bilan OHADA", done: readiness >= 50, demo: true },
      { label: "Compte de resultat", done: realCharges > 0 || realProducts > 0, demo: realProducts === 0 },
      { label: "Tableau des flux", done: true, demo: true },
      { label: "Notes annexes", done: readiness >= 80, demo: true },
    ],
    demo: true,
  });
});
