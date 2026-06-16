import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/clients/:id/accounting-summary — agrégat réel à partir des documents du client.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE);
  const { id } = await params;

  const client = await prisma.clientAccount.findUnique({ where: { id }, select: { id: true } });
  if (!client) throw new ApiError(404, "Client introuvable.");

  const docs = await prisma.document.findMany({
    where: { clientId: id, deletedAt: null, sysohadaCode: { not: null }, amount: { not: null } },
    select: { sysohadaCode: true, sysohadaLabel: true, amount: true },
  });

  // Regroupe par compte ; classe 6 = charges, classe 7 = produits.
  const charges = new Map<string, { code: string; label: string; amount: number }>();
  const produits = new Map<string, { code: string; label: string; amount: number }>();
  for (const d of docs) {
    const code = d.sysohadaCode!;
    const target = code.startsWith("7") ? produits : code.startsWith("6") ? charges : null;
    if (!target) continue;
    const cur = target.get(code) ?? { code, label: d.sysohadaLabel ?? "", amount: 0 };
    cur.amount += d.amount ?? 0;
    target.set(code, cur);
  }

  const chargeList = [...charges.values()].sort((a, b) => b.amount - a.amount);
  const produitList = [...produits.values()].sort((a, b) => b.amount - a.amount);
  const totalCharges = chargeList.reduce((s, a) => s + a.amount, 0);
  const totalProduits = produitList.reduce((s, a) => s + a.amount, 0);

  return NextResponse.json({
    resultatNet: totalProduits - totalCharges,
    charges: { total: totalCharges, top: chargeList.slice(0, 5) },
    produits: { total: totalProduits, top: produitList.slice(0, 3) },
    tresorerie: null, // non disponible (aucune connexion bancaire en local)
  });
});
