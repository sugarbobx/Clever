import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/integrations/quickbooks/status/:clientId
export const GET = handle(async (req: Request, { params }: { params: Promise<{ clientId: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.EMPLOYEE);
  const { clientId } = await params;
  const conn = await prisma.qboConnection.findUnique({ where: { clientId } });
  return NextResponse.json({ connected: Boolean(conn?.isActive), connection: conn, demo: true });
});
