import { cn } from "@/lib/format";

export function StatsCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("card", accent && "border-primary/40")}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted">{label}</p>
        {icon && <span className={cn("text-muted", accent && "text-primary")}>{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
