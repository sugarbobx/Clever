"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { DocumentDTO, SysohadaAccountDTO } from "@/lib/types";
import { useAuth } from "@/stores/auth.store";
import { ValidationForm } from "@/components/documents/ValidationForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton, ErrorState } from "@/components/ui/Misc";

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [doc, setDoc] = useState<DocumentDTO | null>(null);
  const [accounts, setAccounts] = useState<SysohadaAccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const [d, a] = await Promise.all([
      api.get<{ document: DocumentDTO }>(`/documents/${id}`),
      api.get<{ accounts: SysohadaAccountDTO[] }>("/syscohada/accounts"),
    ]);
    if (d.error) setError(d.error);
    else setDoc(d.data!.document);
    if (a.data) setAccounts(a.data.accounts);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canValidate = user?.role === "MANAGER_N2" || user?.role === "EMPLOYEE";
  const isTrainee = user?.role === "TRAINEE";
  const isPending = doc?.status === "PENDING_VALIDATION";

  return (
    <div>
      <Link href="/app/queue" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft size={15} /> Retour à la file
      </Link>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading || !doc ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{doc.vendor}</h1>
              <p className="text-sm text-muted">
                {doc.client?.name} · source {doc.source}
              </p>
            </div>
            <StatusBadge status={doc.status} />
          </div>

          {isPending ? (
            <ValidationForm doc={doc} accounts={accounts} canValidate={canValidate} isTrainee={isTrainee} />
          ) : (
            <div className="card">
              <p className="text-sm text-slate-300">
                Ce document a déjà été traité (statut : <strong>{doc.status}</strong>). Aucune action supplémentaire
                requise.
              </p>
              {doc.validation?.notes && <p className="mt-2 text-sm text-muted">Note : {doc.validation.notes}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
