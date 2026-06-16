"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { api } from "@/lib/api";
import type { DocumentDTO, DocumentStatus } from "@/lib/types";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/Misc";

const FILTERS: { label: string; value: DocumentStatus | "ALL" }[] = [
  { label: "Tous", value: "ALL" },
  { label: "À valider", value: "PENDING_VALIDATION" },
  { label: "Enregistrés", value: "PUSHED_TO_QBO" },
  { label: "Rejetés", value: "REJECTED" },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [filter, setFilter] = useState<DocumentStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = filter === "ALL" ? "" : `?status=${filter}`;
    const { data, error } = await api.get<{ documents: DocumentDTO[] }>(`/documents${qs}`);
    if (error) setError(error);
    else setDocs(data!.documents);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Documents</h1>
      <p className="mb-5 text-sm text-muted">Tous les documents traités par le cabinet.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value ? "bg-primary text-white" : "border border-border text-slate-300 hover:bg-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : docs.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="Aucun document" desc="Aucun document ne correspond à ce filtre." />
      ) : (
        <DocumentTable docs={docs} />
      )}
    </div>
  );
}
