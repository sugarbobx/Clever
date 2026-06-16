import { NextResponse } from "next/server";
import { z } from "zod";
import { computeIS, tvaRate } from "@clever/fiscal-engine";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";

export const dynamic = "force-dynamic";

const vatSchema = z.object({
  turnover: z.coerce.number().min(0),
  expenses: z.coerce.number().min(0).default(0),
  country: z.string().default("CM"),
});

// POST /api/tax/vat — TVA + IS estimate (companies)
export const POST = handle(async (req: Request) => {
  await requireAuth(req);
  const body = await req.json().catch(() => ({}));
  const parsed = vatSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Données invalides.");
  const { turnover, expenses, country } = parsed.data;
  const rate = tvaRate(country);
  const vatCollected = Math.round(turnover * rate);
  const vatDeductible = Math.round(expenses * rate);
  const vatDue = Math.max(0, vatCollected - vatDeductible);
  const is = computeIS(Math.max(0, turnover - expenses), turnover, country);
  return NextResponse.json({ country, rate, vatCollected, vatDeductible, vatDue, corporateTax: is });
});
