import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/jwt";

export const dynamic = "force-dynamic";

// POST /api/auth/logout
export async function POST() {
  const jar = await cookies();
  jar.delete({ name: ACCESS_COOKIE, path: "/" });
  jar.delete({ name: REFRESH_COOKIE, path: "/" });
  return NextResponse.json({ ok: true });
}
