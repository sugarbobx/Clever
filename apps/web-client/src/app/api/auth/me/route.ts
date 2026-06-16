import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";

export const dynamic = "force-dynamic";

// GET /api/auth/me
export const GET = handle(async (req: Request) => {
  const session = await requireAuth(req);
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || user.deletedAt) throw new ApiError(401, "Non authentifié.");
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clientAccountId: user.clientAccountId,
      onboardingCompleted: user.onboardingCompleted,
    },
  });
});
