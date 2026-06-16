import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/health
export function GET() {
  return NextResponse.json({ status: "ok", version: "0.1.0", demo: true });
}
