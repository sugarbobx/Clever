import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/staff — assignable staff (managers + collaborators), for the
// onboarding wizard's "comptable assigné" dropdown.
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE);
  const staff = await prisma.user.findMany({
    where: { role: { in: [ROLES.MANAGER_N2, ROLES.EMPLOYEE] }, deletedAt: null },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ staff });
});
