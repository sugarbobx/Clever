import type { DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/format";

const MAP: Record<DocumentStatus, { label: string; cls: string }> = {
  PENDING_OCR: { label: "OCR en cours", cls: "bg-slate-500/15 text-slate-300" },
  PENDING_VALIDATION: { label: "À valider", cls: "bg-amber-500/15 text-amber-400" },
  APPROVED: { label: "Approuvé", cls: "bg-emerald-500/15 text-emerald-400" },
  REJECTED: { label: "Rejeté", cls: "bg-red-500/15 text-red-400" },
  PUSHED_TO_QBO: { label: "Enregistré (QBO)", cls: "bg-primary/15 text-primary" },
  QBO_ERROR: { label: "Erreur QBO", cls: "bg-red-500/15 text-red-400" },
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const m = MAP[status] ?? MAP.PENDING_OCR;
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", m.cls)}>{m.label}</span>;
}

export function ConfidenceBadge({ value, showLabel = false }: { value: number | null; showLabel?: boolean }) {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  // Thresholds per the product spec: ≥85 % high, 70–84 % verify, <70 % review.
  const tier =
    value >= 0.85
      ? { cls: "bg-emerald-500/15 text-emerald-400", label: "Confiance élevée" }
      : value >= 0.7
        ? { cls: "bg-amber-500/15 text-amber-400", label: "Vérifier les détails" }
        : { cls: "bg-red-500/15 text-red-400", label: "Révision requise" };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", tier.cls)}>
      {showLabel ? `${tier.label} · ${pct}%` : `Confiance ${pct}%`}
    </span>
  );
}
