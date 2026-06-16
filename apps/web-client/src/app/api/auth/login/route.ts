import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOpts,
  refreshCookieOpts,
  signAccessToken,
  signRefreshToken,
  type JwtPayload,
} from "@/server/jwt";
import { ApiError, handle } from "@/server/http";
import type { Role } from "@/server/enums";

export const dynamic = "force-dynamic";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function publicUser(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  clientAccountId: string | null;
  onboardingCompleted: boolean;
}) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, clientAccountId: u.clientAccountId, onboardingCompleted: u.onboardingCompleted };
}

// POST /api/auth/login
export const POST = handle(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Email ou mot de passe invalide.");

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || user.deletedAt) throw new ApiError(401, "Identifiants incorrects.");
  const ok = await bcrypt.compare(parsed.data.password, user.password);
  if (!ok) throw new ApiError(401, "Identifiants incorrects.");

  const payload: JwtPayload = {
    sub: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
    clientAccountId: user.clientAccountId,
  };
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, signAccessToken(payload), accessCookieOpts);
  jar.set(REFRESH_COOKIE, signRefreshToken({ sub: user.id }), refreshCookieOpts);
  return NextResponse.json({ user: publicUser(user) });
});
