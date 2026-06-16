import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle } from "@/server/http";
import {
  CLIENT_ROLES,
  DOCUMENT_STATUS,
  ROLES,
  STAFF_ROLES,
  TIER_DOC_LIMIT,
  TIER_PRICE_XAF,
  SUBSCRIPTION_TIERS,
  type SubscriptionTier,
} from "@/server/enums";

export const dynamic = "force-dynamic";

async function pendingCount(): Promise<number> {
  return prisma.document.count({ where: { status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null } });
}

// GET /api/dashboard — role-scoped summary stats
export const GET = handle(async (req: Request) => {
  const { role, clientAccountId } = await requireAuth(req);

  if (CLIENT_ROLES.includes(role)) {
    const account = clientAccountId
      ? await prisma.clientAccount.findUnique({
          where: { id: clientAccountId },
          include: { assignedStaff: { select: { name: true } } },
        })
      : null;
    const [total, pushed, pending, recent] = await Promise.all([
      prisma.document.count({ where: { clientId: clientAccountId ?? "__none__", deletedAt: null } }),
      prisma.document.count({
        where: { clientId: clientAccountId ?? "__none__", status: DOCUMENT_STATUS.PUSHED_TO_QBO, deletedAt: null },
      }),
      prisma.document.count({
        where: { clientId: clientAccountId ?? "__none__", status: DOCUMENT_STATUS.PENDING_VALIDATION, deletedAt: null },
      }),
      prisma.document.findMany({
        where: { clientId: clientAccountId ?? "__none__", deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    return NextResponse.json({
      scope: "client",
      account: account
        ? {
            name: account.name,
            type: account.type,
            tier: account.subscriptionTier,
            documentCount: account.documentCount,
            country: account.country,
            referent: account.assignedStaff?.name ?? null,
          }
        : null,
      stats: { totalDocuments: total, pushedToQbo: pushed, pending },
      recent,
    });
  }

  // Staff / manager view
  const [pending, total, pushed, clients] = await Promise.all([
    pendingCount(),
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.document.count({ where: { status: DOCUMENT_STATUS.PUSHED_TO_QBO, deletedAt: null } }),
    prisma.clientAccount.findMany({
      where: { deletedAt: null },
      include: { qboConnection: { select: { isActive: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const mrr = clients.reduce(
    (sum, c) => sum + (TIER_PRICE_XAF[c.subscriptionTier as SubscriptionTier] ?? 0),
    0
  );

  // ── Manager "god view": alerts, activity feed, 30-day trend, tier split ──
  let manager: Record<string, unknown> | undefined;
  if (role === ROLES.MANAGER_N2) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 29);
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [qboErrors, recentDocs, activity, docsThisMonth] = await Promise.all([
      prisma.document.count({ where: { status: DOCUMENT_STATUS.QBO_ERROR, deletedAt: null } }),
      prisma.document.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
      }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.document.count({ where: { createdAt: { gte: firstOfMonth }, deletedAt: null } }),
    ]);

    // 30-day daily document counts.
    const byDay = new Map<string, number>();
    for (const d of recentDocs) {
      const key = d.createdAt.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const daily: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      daily.push({ date: key, count: byDay.get(key) ?? 0 });
    }

    // Tier split + near-limit detection.
    const clientsByTier: Record<string, number> = {
      [SUBSCRIPTION_TIERS.DECLARANT_SOLO]: 0,
      [SUBSCRIPTION_TIERS.COMPTABLE_PRO]: 0,
      [SUBSCRIPTION_TIERS.GRAND_COMPTE]: 0,
    };
    const alerts: { level: "red" | "amber"; message: string }[] = [];
    for (const c of clients) {
      clientsByTier[c.subscriptionTier] = (clientsByTier[c.subscriptionTier] ?? 0) + 1;
      const limit = TIER_DOC_LIMIT[c.subscriptionTier as SubscriptionTier];
      if (limit && c.documentCount >= Math.floor(limit * 0.9)) {
        alerts.push({ level: "amber", message: `${c.name} à ${c.documentCount}/${limit} documents — upgrade recommandé.` });
      }
    }
    if (qboErrors > 0) {
      alerts.unshift({ level: "red", message: `${qboErrors} document(s) en erreur QuickBooks — reconnexion requise.` });
    }
    if (pending > 20) {
      alerts.push({ level: "amber", message: `${pending} documents en attente. Pensez à assigner des ressources.` });
    }

    // Per-client table (the "Vue Dieu" overview) + QBO connection metric.
    const activeQbo = clients.filter((c) => c.qboConnection?.isActive).length;
    const clientsTable = clients.slice(0, 20).map((c) => ({
      id: c.id,
      name: c.name,
      subscriptionTier: c.subscriptionTier,
      documentCount: c.documentCount,
      qboActive: Boolean(c.qboConnection?.isActive),
      lastActivity: c.updatedAt.toLocaleDateString("fr-FR"),
    }));

    manager = {
      alerts,
      activity,
      daily,
      clientsByTier,
      qboErrors,
      docsThisMonth,
      activeQbo,
      totalClients: clients.length,
      clients: clientsTable,
    };
  }

  return NextResponse.json({
    scope: STAFF_ROLES.includes(role) ? "staff" : "client",
    stats: {
      pendingValidation: pending,
      totalDocuments: total,
      pushedToQbo: pushed,
      activeClients: clients.length,
      estimatedMrrXaf: mrr,
    },
    manager,
  });
});
