import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { audit } from "@/server/audit";
import { ROLES, SUBSCRIPTION_TIERS, type SubscriptionTier } from "@/server/enums";

export const dynamic = "force-dynamic";

const tierSchema = z.object({
  subscriptionTier: z.enum([
    SUBSCRIPTION_TIERS.DECLARANT_SOLO,
    SUBSCRIPTION_TIERS.COMPTABLE_PRO,
    SUBSCRIPTION_TIERS.GRAND_COMPTE,
  ]),
});

// PUT /api/clients/:id/subscription — change tier (manager only)
export const PUT = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2);
  const body = await req.json().catch(() => ({}));
  const parsed = tierSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Forfait invalide.");

  const { id } = await params;
  const client = await prisma.clientAccount.update({
    where: { id },
    data: { subscriptionTier: parsed.data.subscriptionTier as SubscriptionTier },
  });
  await audit({
    actorId: user.sub,
    actorName: user.name,
    action: "CLIENT_TIER_CHANGED",
    entity: "ClientAccount",
    entityId: client.id,
    detail: parsed.data.subscriptionTier,
  });
  return NextResponse.json({ client });
});
