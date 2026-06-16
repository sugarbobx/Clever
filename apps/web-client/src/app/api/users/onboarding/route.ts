import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

// POST /api/users/onboarding — { step, data } (sauvegarde démo) ou { completed: true } (réel).
// Le marquage d'achèvement est persisté ; les données d'étape sont conservées côté client (démo).
export const POST = handle(async (req: Request) => {
  const user = await requireAuth(req);
  const body = await req.json().catch(() => ({}));
  if (body?.completed === true) {
    await prisma.user.update({ where: { id: user.sub }, data: { onboardingCompleted: true } });
    return NextResponse.json({ ok: true, onboardingCompleted: true });
  }
  return NextResponse.json({ ok: true });
});
