"use client";

import Link from "next/link";
import { AlertTriangle, MessageCircle, Upload, Building2 } from "lucide-react";
import type { DocumentDTO } from "@/lib/types";
import { StatusBadge, ConfidenceBadge } from "@/components/ui/StatusBadge";
import { formatXAF, formatDate } from "@/lib/format";

const SOURCE_ICON = { WHATSAPP: MessageCircle, PORTAL: Upload, STAFF: Building2 } as const;

export function DocumentTable({
  docs,
  hrefBase = "/app/documents",
  selectable = false,
  selected,
  onToggle,
  onToggleAll,
}: {
  docs: DocumentDTO[];
  hrefBase?: string;
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: (checked: boolean) => void;
}) {
  const allChecked = selectable && docs.length > 0 && docs.every((d) => selected?.has(d.id));
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input type="checkbox" checked={allChecked} onChange={(e) => onToggleAll?.(e.target.checked)} className="accent-primary" />
              </th>
            )}
            <th className="px-4 py-3 font-semibold">Fournisseur</th>
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Montant</th>
            <th className="px-4 py-3 font-semibold">SYSCOHADA</th>
            <th className="px-4 py-3 font-semibold">Confiance</th>
            <th className="px-4 py-3 font-semibold">Date</th>
            <th className="px-4 py-3 font-semibold">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {docs.map((d) => {
            const Icon = SOURCE_ICON[d.source] ?? Upload;
            return (
              <tr key={d.id} className="bg-surface/40 hover:bg-surface-2">
                {selectable && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected?.has(d.id) ?? false} onChange={() => onToggle?.(d.id)} className="accent-primary" />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link href={`${hrefBase}/${d.id}`} className="flex items-center gap-2 font-medium text-slate-100 hover:text-primary">
                    <Icon size={14} className="text-muted" />
                    {d.vendor ?? "—"}
                    {d.needsReview && <AlertTriangle size={14} className="text-amber-400" />}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{d.client?.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-slate-200">{formatXAF(d.amount)}</td>
                <td className="px-4 py-3">
                  {d.sysohadaCode ? (
                    <span className="font-mono text-primary">{d.sysohadaCode}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ConfidenceBadge value={d.ocrConfidence} />
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(d.date)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
