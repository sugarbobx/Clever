import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle } from "@/server/http";
import { STAFF_ROLES, type Role } from "@/server/enums";

export const dynamic = "force-dynamic";

/** Build a where-clause scoping documents to the requesting user's visibility. */
function scopeFor(role: Role, clientAccountId?: string | null) {
  if (STAFF_ROLES.includes(role)) return { deletedAt: null };
  return { deletedAt: null, clientId: clientAccountId ?? "__none__" };
}

function ocrCategory(code?: string | null) {
  if (!code) return "A classer";
  if (code.startsWith("625")) return "Missions et deplacements";
  if (code.startsWith("626")) return "Telecom et internet";
  if (code.startsWith("627")) return "Services bancaires";
  if (code.startsWith("604") || code.startsWith("606")) return "Fournitures";
  if (code.startsWith("63")) return "Impots et taxes";
  if (code.startsWith("64")) return "Personnel";
  if (code.startsWith("7")) return "Produit";
  return "Charge comptable";
}

function enrichOcr<T extends {
  vendor: string | null;
  amount: number | null;
  date: Date | null;
  vatAmount: number | null;
  sysohadaCode: string | null;
  sysohadaLabel: string | null;
  ocrConfidence: number | null;
  needsReview: boolean;
}>(doc: T) {
  const missing = [
    !doc.vendor ? "fournisseur" : null,
    doc.amount == null ? "montant" : null,
    !doc.date ? "date" : null,
    doc.vatAmount == null ? "TVA" : null,
    !doc.sysohadaCode ? "compte SYSCOHADA" : null,
    doc.needsReview || (doc.ocrConfidence ?? 1) < 0.7 ? "validation humaine" : null,
  ].filter(Boolean);
  const gross = doc.amount ?? 0;
  const vat = doc.vatAmount ?? 0;
  const net = Math.max(0, gross - vat);

  return {
    ...doc,
    ocrMissingFields: missing,
    ocrCategory: ocrCategory(doc.sysohadaCode),
    ocrCompleteness: Math.max(0, Math.round(((6 - missing.length) / 6) * 100)),
    suggestedEntry: gross > 0 && doc.sysohadaCode
      ? {
          debit: [
            { code: doc.sysohadaCode, label: doc.sysohadaLabel ?? "Charge", amount: net || gross },
            ...(vat > 0 ? [{ code: "445", label: "TVA recuperable", amount: vat }] : []),
          ],
          credit: { code: "401", label: "Fournisseurs", amount: gross },
          demo: true,
        }
      : null,
  };
}

// GET /api/documents — role-scoped list (optional ?status=)
export const GET = handle(async (req: Request) => {
  const { role, clientAccountId } = await requireAuth(req);
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const where = { ...scopeFor(role, clientAccountId), ...(status ? { status } : {}) };
  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true, type: true } }, validation: true },
    take: 200,
  });
  return NextResponse.json({ documents: documents.map(enrichOcr) });
});
