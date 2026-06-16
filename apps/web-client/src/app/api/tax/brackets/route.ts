import { NextResponse } from "next/server";
import { IRPP_BRACKETS_CM } from "@clever/fiscal-engine";
import { requireAuth } from "@/server/auth";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

// GET /api/tax/brackets — expose the IRPP barème (for the simulator UI)
export const GET = handle(async (req: Request) => {
  await requireAuth(req);
  return NextResponse.json({ irpp: IRPP_BRACKETS_CM });
});
