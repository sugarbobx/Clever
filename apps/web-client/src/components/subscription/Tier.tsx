import type { SubscriptionTier } from "@/lib/types";
import { cn } from "@/lib/format";

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  DECLARANT_SOLO: "Déclarant Solo",
  COMPTABLE_PRO: "Comptable Pro",
  GRAND_COMPTE: "Grand Compte",
};

const TIER_CLS: Record<SubscriptionTier, string> = {
  DECLARANT_SOLO: "bg-slate-500/15 text-slate-300",
  COMPTABLE_PRO: "bg-primary/15 text-primary",
  GRAND_COMPTE: "bg-amber-500/15 text-amber-400",
};

export function TierBadge({ tier }: { tier: SubscriptionTier }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", TIER_CLS[tier])}>{TIER_LABELS[tier]}</span>;
}

export function UsageMeter({ used, limit }: { used: number; limit: number | null }) {
  if (limit == null) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-slate-200">Documents ce mois</p>
        <p className="mt-1 text-2xl font-bold text-emerald-400">Illimité</p>
      </div>
    );
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-slate-200">Documents ce mois</p>
        <p className="text-sm text-muted">
          {used}/{limit}
        </p>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 80 && (
        <p className={cn("mt-2 text-xs", pct >= 100 ? "text-red-400" : "text-amber-400")}>
          {pct >= 100 ? "Limite atteinte — passez à un forfait supérieur." : "Vous approchez de votre limite mensuelle."}
        </p>
      )}
    </div>
  );
}
