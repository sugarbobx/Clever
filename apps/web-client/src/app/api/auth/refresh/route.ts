import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOpts,
  signAccessToken,
  verifyRefreshToken,
  type JwtPayload,
} from "@/server/jwt";
import type { Role } from "@/server/enums";

export const dynamic = "force-dynamic";

function publicUser(u: { id: string; email: string; name: string; role: string; clientAccountId: string | null }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, clientAccountId: u.clientAccountId };
}

// POST /api/auth/refresh
export async function POST() {
  try {
    const token = (await cookies()).get(REFRESH_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: true, message: "Non authentifié." }, { status: 401 });
    const { sub } = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: true, message: "Session invalide." }, { status: 401 });
    }
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as Role,
      name: user.name,
      email: user.email,
      clientAccountId: user.clientAccountId,
    };
    (await cookies()).set(ACCESS_COOKIE, signAccessToken(payload), accessCookieOpts);
    return NextResponse.json({ user: publicUser(user) });
  } catch {
    return NextResponse.json({ error: true, message: "Session expirée." }, { status: 401 });
  }
}
