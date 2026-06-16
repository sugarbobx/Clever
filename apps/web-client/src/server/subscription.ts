import type { ClientAccount } from "@prisma/client";
import { prisma } from "./prisma";
import { ApiError } from "./http";
import { TIER_DOC_LIMIT, type SubscriptionTier } from "./enums";
import type { JwtPayload } from "./jwt";

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Enforce the per-month document cap for the requesting client's tier.
 * Resets the monthly counter when a new billing month has started.
 * On limit reached → throws ApiError(402, { upgrade_required: true }).
 * Returns the resolved ClientAccount for downstream use.
 */
export async function enforceDocumentLimit(user: JwtPayload): Promise<ClientAccount> {
  const clientAccountId = user.clientAccountId;
  if (!clientAccountId) throw new ApiError(403, "Aucun compte client associé.");

  const account = await prisma.clientAccount.findUnique({ where: { id: clientAccountId } });
  if (!account) throw new ApiError(404, "Compte client introuvable.");

  // Roll over the monthly counter if we've crossed into a new month.
  const monthStart = startOfMonth();
  let documentCount = account.documentCount;
  if (account.monthResetAt < monthStart) {
    documentCount = 0;
    await prisma.clientAccount.update({
      where: { id: account.id },
      data: { documentCount: 0, monthResetAt: monthStart },
    });
  }

  const limit = TIER_DOC_LIMIT[account.subscriptionTier as SubscriptionTier];
  if (limit !== null && documentCount >= limit) {
    throw new ApiError(
      402,
      `Limite mensuelle de ${limit} documents atteinte. Passez à un forfait supérieur.`,
      { upgrade_required: true }
    );
  }

  return account;
}
