import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/clients/:id/fiscal-summary — TVA réelle (mois courant) + estimations démo (IS, conformité).
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE);
  const { id } = await params;

  const client = await prisma.clientAccount.findUnique({ where: { id }, select: { id: true } });
  if (!client) throw new ApiError(404, "Client introuvable.");

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const docs = await prisma.document.findMany({
    where: { clientId: id, deletedAt: null, createdAt: { gte: firstOfMonth } },
    select: { sysohadaCode: true, vatAmount: true, amount: true },
  });

  let tvaCollectee = 0;
  let tvaDeductible = 0;
  let produits = 0;
  let charges = 0;
  for (const d of docs) {
    const code = d.sysohadaCode ?? "";
    if (code.startsWith("7")) {
      tvaCollectee += d.vatAmount ?? 0;
      produits += d.amount ?? 0;
    } else if (code.startsWith("6")) {
      tvaDeductible += d.vatAmount ?? 0;
      charges += d.amount ?? 0;
    }
  }

  const tvaNette = tvaCollectee - tvaDeductible; // > 0 : à reverser ; < 0 : crédit de TVA
  const isEstime = Math.round(Math.max(0, produits - charges) * 0.3); // IS CM 30 % (estimation démo)

  return NextResponse.json({
    period: firstOfMonth.toISOString().slice(0, 7),
    tvaCollectee,
    tvaDeductible,
    tvaNette,
    isEstime,
    derniereDeclaration: { label: "Déclaration TVA", date: new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() - 1, 15).toISOString() },
    conformite: 92, // démo — score de conformité fiscale
  });
});
