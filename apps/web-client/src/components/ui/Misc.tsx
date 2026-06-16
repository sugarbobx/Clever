import { cn } from "@/lib/format";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

export function DemoBadge() {
  return <span className="demo-badge">démo</span>;
}

export function EmptyState({ icon, title, desc, action }: { icon?: React.ReactNode; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="text-base font-semibold text-slate-200">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-6 text-center">
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-4">
          Réessayer
        </button>
      )}
    </div>
  );
}
