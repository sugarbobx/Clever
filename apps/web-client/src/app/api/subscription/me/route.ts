import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { TIER_DOC_LIMIT, TIER_LABELS, TIER_PRICE_XAF, type SubscriptionTier } from "@/server/enums";

export const dynamic = "force-dynamic";

// GET /api/subscription/me — current client's usage vs limit
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  if (!user.clientAccountId) throw new ApiError(404, "Aucun compte client.");
  const account = await prisma.clientAccount.findUnique({ where: { id: user.clientAccountId } });
  if (!account) throw new ApiError(404, "Compte introuvable.");
  const tier = account.subscriptionTier as SubscriptionTier;
  return NextResponse.json({
    tier,
    label: TIER_LABELS[tier],
    priceXaf: TIER_PRICE_XAF[tier],
    docLimit: TIER_DOC_LIMIT[tier],
    used: account.documentCount,
  });
});
