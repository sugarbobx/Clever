"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Landmark, X } from "lucide-react";
import { DemoBadge } from "@/components/ui/Misc";

/** Modal de création de NIU (démo) — TCCS soumet la demande à la DGI. */
export function NiuModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [cni, setCni] = useState("");
  const [adresse, setAdresse] = useState("");
  const [activite, setActivite] = useState("");
  const valid = cni.trim().length >= 4 && adresse.trim().length >= 3 && activite.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Landmark size={18} /> Créer mon NIU
          </h3>
          <button onClick={onClose} aria-label="Fermer" className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          TCCS soumet votre demande à la DGI. Renseignez vos informations — votre NIU sera ajouté automatiquement dès réception. <DemoBadge />
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">Numéro CNI</label>
            <input className="input font-mono" value={cni} onChange={(e) => setCni(e.target.value)} placeholder="123456789" />
          </div>
          <div>
            <label className="label">Adresse</label>
            <input className="input" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Quartier, ville" />
          </div>
          <div>
            <label className="label">Activité principale</label>
            <input className="input" value={activite} onChange={(e) => setActivite(e.target.value)} placeholder="Commerce, prestation de services…" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button
            onClick={() => {
              onSubmitted();
              onClose();
              toast.success("Demande de NIU enregistrée — TCCS la soumettra à la DGI sous 48h (démo).");
            }}
            disabled={!valid}
            className="btn-primary"
          >
            Soumettre à la DGI
          </button>
        </div>
      </div>
    </div>
  );
}
