import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { CLIENT_ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/documents/:id
export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { role, clientAccountId } = await requireAuth(req);
  const { id } = await params;
  const doc = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: { client: true, validation: { include: { validatedBy: { select: { name: true } } } } },
  });
  if (!doc) throw new ApiError(404, "Document introuvable.");
  if (CLIENT_ROLES.includes(role) && doc.clientId !== clientAccountId) {
    throw new ApiError(403, "Accès refusé.");
  }
  return NextResponse.json({ document: doc });
});
