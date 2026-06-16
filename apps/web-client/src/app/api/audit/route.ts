import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle } from "@/server/http";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/audit — immutable activity timeline (manager + HR)
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2, ROLES.HR);
  const entityId = new URL(req.url).searchParams.get("entityId") ?? undefined;
  const logs = await prisma.auditLog.findMany({
    where: entityId ? { entityId } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ logs });
});
