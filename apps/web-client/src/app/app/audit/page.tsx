"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/Misc";
import { formatDateTime } from "@/lib/format";

interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<{ logs: AuditEntry[] }>("/audit");
    if (error) setError(error);
    else setLogs(data!.logs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Journal d&apos;audit</h1>
      <p className="mb-5 text-sm text-muted">Traçabilité immuable de chaque action sur le système.</p>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : logs.length === 0 ? (
        <EmptyState icon={<ScrollText size={32} />} title="Aucune activité" desc="Les actions apparaîtront ici." />
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="flex items-start gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3">
              <span className="mt-0.5 inline-flex rounded bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary">{l.action}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-200">
                  <span className="font-semibold">{l.actorName}</span> · {l.entity}
                </p>
                {l.detail && <p className="truncate text-xs text-muted">{l.detail}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted">{formatDateTime(l.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
