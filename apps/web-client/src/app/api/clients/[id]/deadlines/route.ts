import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/clients/:id/deadlines — échéances à venir (≤ 60 j). Démo : calculées relativement à aujourd'hui.
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE);
  const { id } = await params;

  const client = await prisma.clientAccount.findUnique({ where: { id }, select: { id: true, type: true } });
  if (!client) throw new ApiError(404, "Client introuvable.");

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthName = (d: Date) => d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Le 15 du mois courant ou suivant selon la date du jour.
  const next15 = now.getDate() <= 15 ? new Date(y, m, 15) : new Date(y, m + 1, 15);
  const candidates = [
    { id: "tva", type: "fiscal", label: `Déclaration TVA ${monthName(new Date(y, m - 1, 1))}`, dueDate: next15, status: "TODO" },
    { id: "cnps", type: "paiement", label: `Cotisations CNPS ${monthName(new Date(y, m - 1, 1))}`, dueDate: next15, status: "EN_COURS" },
    { id: "is", type: "fiscal", label: "Acompte d'impôt sur les sociétés", dueDate: new Date(y, m + 1, 15), status: "TODO" },
    { id: "rccm", type: "legal", label: "Mise à jour RCCM / registres", dueDate: new Date(y, m + 1, 28), status: "TODO" },
    { id: "dsf", type: "fiscal", label: "Préparation DSF annuelle", dueDate: new Date(y, m + 2, 15), status: "TODO" },
  ];

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 60);
  const deadlines = candidates
    .filter((c) => c.dueDate >= new Date(now.toDateString()) && c.dueDate <= horizon)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .map((c) => ({
      id: c.id,
      type: c.type,
      label: c.label,
      dueDate: c.dueDate.toISOString(),
      daysLeft: Math.ceil((c.dueDate.getTime() - now.getTime()) / 86400000),
      status: c.status,
    }));

  return NextResponse.json({ deadlines, demo: true });
});
