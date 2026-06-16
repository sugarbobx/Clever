import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/clients/:id — detail (manager + employee)
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE);
  const { id } = await params;
  const client = await prisma.clientAccount.findUnique({
    where: { id },
    include: {
      assignedStaff: { select: { id: true, name: true, email: true } },
      qboConnection: true,
      documents: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { documents: true } },
    },
  });
  if (!client) throw new ApiError(404, "Client introuvable.");
  return NextResponse.json({ client });
});
