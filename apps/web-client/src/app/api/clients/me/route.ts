import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/clients/me — the requesting client's own account
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.CLIENT_INDIVIDUAL, ROLES.CLIENT_COMPANY);
  const account = user.clientAccountId
    ? await prisma.clientAccount.findUnique({
        where: { id: user.clientAccountId },
        include: { assignedStaff: { select: { name: true, email: true } }, qboConnection: true },
      })
    : null;
  if (!account) throw new ApiError(404, "Compte introuvable.");
  return NextResponse.json({ account });
});
