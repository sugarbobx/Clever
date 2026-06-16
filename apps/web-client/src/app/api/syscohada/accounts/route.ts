import { NextResponse } from "next/server";
import { SYSCOHADA_LIST, SYSCOHADA_CLASSES } from "@clever/fiscal-engine";
import { requireAuth } from "@/server/auth";
import { handle } from "@/server/http";

export const dynamic = "force-dynamic";

// GET /api/syscohada/accounts — for the ValidationForm dropdown
export const GET = handle(async (req: Request) => {
  await requireAuth(req);
  return NextResponse.json({ classes: SYSCOHADA_CLASSES, accounts: SYSCOHADA_LIST });
});
