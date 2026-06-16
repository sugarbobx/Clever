"use client";

import { useEffect, useState } from "react";
import { Landmark, X } from "lucide-react";
import { DemoBadge } from "@/components/ui/Misc";
import { NiuModal } from "./NiuModal";

/** Bannière proposée au client sans NIU (issu de l'onboarding) — création depuis le dashboard. */
export function NiuBanner({ userId }: { userId: string }) {
  const key = `clever:niu-pending:${userId}`;
  const [status, setStatus] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    setStatus(localStorage.getItem(key));
  }, [key]);

  if (status !== "true" && status !== "requested") return null;

  if (status === "requested") {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <Landmark size={18} className="shrink-0" />
        <span>Demande de NIU en cours — TCCS la soumet à la DGI. Votre NIU sera ajouté automatiquement. <DemoBadge /></span>
        <button onClick={() => { localStorage.removeItem(key); setStatus(null); }} aria-label="Masquer" className="ml-auto text-emerald-300/70 hover:text-emerald-200">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
      <Landmark size={18} className="shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100">Vous n&apos;avez pas encore de NIU</p>
        <p className="text-xs text-muted">Créez-le gratuitement avec TCCS — nous soumettons la demande à la DGI pour vous.</p>
      </div>
      <button onClick={() => setModal(true)} className="btn-primary ml-auto !py-1.5 text-xs">
        Créer mon NIU
      </button>
      {modal && (
        <NiuModal
          onClose={() => setModal(false)}
          onSubmitted={() => {
            localStorage.setItem(key, "requested");
            setStatus("requested");
          }}
        />
      )}
    </div>
  );
}
