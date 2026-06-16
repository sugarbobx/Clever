import { NextResponse } from "next/server";
import { z } from "zod";
import { computeIRPP } from "@clever/fiscal-engine";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";

export const dynamic = "force-dynamic";

const irppSchema = z.object({ income: z.coerce.number().min(0) });

// POST /api/tax/irpp — personal income tax simulation (individuals)
export const POST = handle(async (req: Request) => {
  await requireAuth(req);
  const body = await req.json().catch(() => ({}));
  const parsed = irppSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Revenu invalide.");
  return NextResponse.json(computeIRPP(parsed.data.income));
});
