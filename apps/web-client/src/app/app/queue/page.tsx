"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Inbox, MessageCircle, Loader2, Check, UserPlus, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import type { DocumentDTO } from "@/lib/types";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { Skeleton, EmptyState, ErrorState, DemoBadge } from "@/components/ui/Misc";

// Stagiaires assignables — démo (pas d'endpoint listant les TRAINEE).
const DEMO_TRAINEES = [
  { id: "t1", name: "Yann Foko" },
  { id: "t2", name: "Ange Ndoumbe" },
  { id: "t3", name: "Carine Mballa" },
];

export default function QueuePage() {
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const assignRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<{ documents: DocumentDTO[] }>("/documents?status=PENDING_VALIDATION");
    if (error) setError(error);
    else setDocs(data!.documents);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) setAssignOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function simulate() {
    setSimulating(true);
    const { error } = await api.post("/demo/simulate-receipt", {});
    setSimulating(false);
    if (error) return toast.error(error);
    toast.success("Nouveau reçu ajouté à la file.");
    load();
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(docs.map((d) => d.id)) : new Set());
  }

  const selectedDocs = useMemo(() => docs.filter((d) => selected.has(d.id)), [docs, selected]);
  // « Approuver tout » uniquement si TOUS les sélectionnés ont une confiance de 100 %.
  const allCertain = selectedDocs.length > 0 && selectedDocs.every((d) => d.ocrConfidence === 1);

  async function approveAll() {
    setBusy(true);
    let ok = 0;
    for (const d of selectedDocs) {
      const { error } = await api.put(`/validation/${d.id}`, { action: "APPROVED" });
      if (!error) ok++;
    }
    setBusy(false);
    toast.success(`${ok}/${selectedDocs.length} document(s) approuvé(s) et poussés vers QuickBooks (démo).`);
    load();
  }

  function assignTo(trainee: { id: string; name: string }) {
    setAssignOpen(false);
    // Démo : PATCH /api/documents/assign inexistant → simulation.
    toast.success(`${selectedDocs.length} document(s) assigné(s) à ${trainee.name} (démo).`);
    setSelected(new Set());
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">File de validation</h1>
          <p className="text-sm text-muted">Documents en attente de revue par un comptable.</p>
        </div>
        <button onClick={simulate} disabled={simulating} className="btn-ghost">
          {simulating ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
          Simuler réception <DemoBadge />
        </button>
      </div>

      {/* Barre d'actions en lot */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium text-slate-100">{selected.size} document(s) sélectionné(s)</span>
          <div className="flex flex-wrap items-center gap-2">
            <div ref={assignRef} className="relative">
              <button onClick={() => setAssignOpen((v) => !v)} className="btn-ghost">
                <UserPlus size={16} /> Assigner à un stagiaire <ChevronDown size={14} />
              </button>
              {assignOpen && (
                <div className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
                  <p className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase text-muted">
                    Stagiaires <DemoBadge />
                  </p>
                  {DEMO_TRAINEES.map((t) => (
                    <button key={t.id} onClick={() => assignTo(t)} className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-surface-2">
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="group relative">
              <button
                onClick={approveAll}
                disabled={busy || !allCertain}
                className="btn bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approuver tout ({selected.size})
              </button>
              {!allCertain && (
                <span className="pointer-events-none absolute right-0 top-full z-30 mt-1 hidden w-64 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted shadow-lg group-hover:block">
                  Un ou plusieurs documents nécessitent une vérification manuelle (confiance &lt; 100 %).
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<Inbox size={32} />}
          title="Aucun document en attente"
          desc="La file est vide. Simulez une réception WhatsApp pour tester le flux."
          action={
            <button onClick={simulate} className="btn-primary">
              <MessageCircle size={16} /> Simuler une réception
            </button>
          }
        />
      ) : (
        <DocumentTable docs={docs} selectable selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
      )}
    </div>
  );
}
