"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, FileText, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import type { DocumentDTO } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/Misc";
import { formatXAF, formatDate } from "@/lib/format";

export default function ClientDocumentsPage() {
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [upgrade, setUpgrade] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<{ documents: DocumentDTO[] }>("/documents");
    if (error) setError(error);
    else setDocs(data!.documents);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    const { error, upgradeRequired } = await api.upload("/documents/upload", form);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (upgradeRequired) {
      setUpgrade(true);
      toast.error("Limite mensuelle atteinte.");
      return;
    }
    if (error) return toast.error(error);
    toast.success("Document envoyé — en attente de validation.");
    load();
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Mes documents</h1>
          <p className="text-sm text-muted">Envoyez vos reçus et suivez leur traitement.</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary">
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Envoyer un document
        </button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      </div>

      {upgrade && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="text-sm text-amber-200">
            Vous avez atteint votre limite mensuelle de 30 documents (forfait Déclarant Solo). Passez au forfait{" "}
            <strong>Comptable Pro</strong> pour un volume illimité.
          </div>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="Aucun document"
          desc="Cliquez sur « Envoyer un document » pour téléverser votre premier reçu."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Fournisseur</th>
                <th className="px-4 py-3 font-semibold">Montant</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {docs.map((d) => (
                <tr key={d.id} className="bg-surface/40">
                  <td className="px-4 py-3 font-medium text-slate-100">{d.vendor ?? d.fileName}</td>
                  <td className="px-4 py-3 font-mono text-slate-200">{formatXAF(d.amount)}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(d.date)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
