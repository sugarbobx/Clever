import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

// GET /api/users/onboarding/progress — état d'achèvement (reprise gérée côté client/localStorage).
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  const u = await prisma.user.findUnique({ where: { id: user.sub }, select: { onboardingCompleted: true } });
  return NextResponse.json({ onboardingCompleted: u?.onboardingCompleted ?? false });
});
