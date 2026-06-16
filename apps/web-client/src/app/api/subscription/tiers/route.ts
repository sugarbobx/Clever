import { NextResponse } from "next/server";
import {
  SUBSCRIPTION_TIERS,
  TIER_DOC_LIMIT,
  TIER_LABELS,
  TIER_PRICE_XAF,
  type SubscriptionTier,
} from "@/server/enums";

// GET /api/subscription/tiers — public catalogue of plans
export function GET() {
  const tiers = (Object.values(SUBSCRIPTION_TIERS) as SubscriptionTier[]).map((t) => ({
    id: t,
    label: TIER_LABELS[t],
    priceXaf: TIER_PRICE_XAF[t],
    docLimit: TIER_DOC_LIMIT[t],
  }));
  return NextResponse.json({ tiers });
}
