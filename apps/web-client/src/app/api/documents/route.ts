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
  return NextResponse.json({ documents });
});
