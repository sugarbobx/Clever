"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Target, ChevronRight, X, Flag, Activity, CheckCircle2, Circle, Send } from "lucide-react";
import { DemoBadge } from "@/components/ui/Misc";
import { formatDateTime } from "@/lib/format";

export type Frequence = "JOURNALIER" | "HEBDOMADAIRE" | "MENSUEL" | "ANNUEL";
export type Priorite = "HAUTE" | "MOYENNE" | "BASSE";
export interface SubObjective {
  id: string;
  title: string;
  done: boolean;
}
export interface DemoObjective {
  id: string;
  title: string;
  frequence: Frequence;
  priorite: Priorite;
  client: string;
  subObjectives: SubObjective[];
  activity: { actor: string; action: string; at: string }[];
}

export const FREQ_LABELS: Record<Frequence, string> = {
  JOURNALIER: "Journalier",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUEL: "Mensuel",
  ANNUEL: "Annuel",
};
const PRIO_CLS: Record<Priorite, string> = {
  HAUTE: "bg-red-500/15 text-red-400",
  MOYENNE: "bg-amber-500/15 text-amber-400",
  BASSE: "bg-slate-500/15 text-slate-300",
};

// Démo : le modèle Objective n'existe pas dans web-client → données et tracking simulés côté front.
export const DEMO_OBJECTIVES: DemoObjective[] = [
  {
    id: "o1",
    title: "Valider les reçus du jour",
    frequence: "JOURNALIER",
    priorite: "HAUTE",
    client: "SARL TechConsult CM",
    subObjectives: [
      { id: "s1", title: "Traiter la file urgente", done: true },
      { id: "s2", title: "Vérifier les TVA déductibles", done: false },
      { id: "s3", title: "Pousser vers QuickBooks", done: false },
    ],
    activity: [
      { actor: "Manager", action: "a créé l'objectif", at: "2026-06-15T08:00:00Z" },
      { actor: "Vous", action: "a complété « Traiter la file urgente »", at: "2026-06-15T09:30:00Z" },
    ],
  },
  {
    id: "o2",
    title: "Rapprochement bancaire hebdomadaire",
    frequence: "HEBDOMADAIRE",
    priorite: "MOYENNE",
    client: "Boutique Awono",
    subObjectives: [
      { id: "s4", title: "Importer le relevé", done: true },
      { id: "s5", title: "Lettrer les écritures", done: false },
    ],
    activity: [{ actor: "Manager", action: "a créé l'objectif", at: "2026-06-12T10:00:00Z" }],
  },
  {
    id: "o3",
    title: "Déclaration TVA mensuelle",
    frequence: "MENSUEL",
    priorite: "HAUTE",
    client: "Portefeuille entreprises",
    subObjectives: [
      { id: "s6", title: "Collecter les factures", done: true },
      { id: "s7", title: "Calculer la TVA nette", done: true },
      { id: "s8", title: "Déposer avant le 15", done: false },
    ],
    activity: [{ actor: "Manager", action: "a créé l'objectif", at: "2026-06-01T09:00:00Z" }],
  },
  {
    id: "o4",
    title: "Clôture annuelle — préparation DSF",
    frequence: "ANNUEL",
    priorite: "BASSE",
    client: "Grand Compte SA",
    subObjectives: [
      { id: "s9", title: "Réviser les comptes de classe 6", done: false },
      { id: "s10", title: "Préparer les états financiers", done: false },
    ],
    activity: [{ actor: "Manager", action: "a créé l'objectif", at: "2026-01-10T09:00:00Z" }],
  },
];

function progressOf(o: DemoObjective) {
  if (o.subObjectives.length === 0) return 0;
  return Math.round((o.subObjectives.filter((s) => s.done).length / o.subObjectives.length) * 100);
}

/** Full personal objectives experience — used on the dedicated page (EMPLOYEE + TRAINEE). */
export function MyObjectives() {
  const [objectives, setObjectives] = useState<DemoObjective[]>(DEMO_OBJECTIVES);
  const [freq, setFreq] = useState<Frequence>("JOURNALIER");
  const [selected, setSelected] = useState<DemoObjective | null>(null);

  function toggleSub(objId: string, subId: string) {
    setObjectives((prev) =>
      prev.map((o) => {
        if (o.id !== objId) return o;
        const subObjectives = o.subObjectives.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
        const sub = subObjectives.find((s) => s.id === subId)!;
        const activity = [...o.activity, { actor: "Vous", action: `${sub.done ? "a complété" : "a rouvert"} « ${sub.title} »`, at: new Date().toISOString() }];
        return { ...o, subObjectives, activity };
      })
    );
    setSelected((cur) => (cur && cur.id === objId ? { ...cur, subObjectives: cur.subObjectives.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) } : cur));
  }

  const counts = (Object.keys(FREQ_LABELS) as Frequence[]).map((f) => ({ f, n: objectives.filter((o) => o.frequence === f).length }));
  const list = objectives.filter((o) => o.frequence === freq);

  return (
    <div className="space-y-5">
      {/* Compteurs par fréquence */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map(({ f, n }) => (
          <button
            key={f}
            onClick={() => setFreq(f)}
            className={`rounded-lg border p-3 text-left transition-colors ${freq === f ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-surface-2"}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{FREQ_LABELS[f]}</p>
            <p className="mt-1 text-2xl font-bold text-white">{n}</p>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Target size={16} /> Objectifs {FREQ_LABELS[freq].toLowerCase()}s
          </p>
          <DemoBadge />
        </div>
        <div className="space-y-2">
          {list.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted">Aucun objectif {FREQ_LABELS[freq].toLowerCase()}.</p>
          ) : (
            list.map((o) => {
              const pct = progressOf(o);
              const done = o.subObjectives.filter((s) => s.done).length;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelected(o)}
                  className="w-full rounded-lg border border-border bg-bg p-3 text-left hover:bg-surface-2"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-100">{o.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIO_CLS[o.priorite]}`}>{o.priorite.toLowerCase()}</span>
                  </div>
                  <p className="mb-2 text-[11px] text-muted">{o.client} · {done}/{o.subObjectives.length} sous-objectifs</p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-muted" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selected && <ObjectiveTracker objective={selected} onClose={() => setSelected(null)} onToggle={(subId) => toggleSub(selected.id, subId)} />}
    </div>
  );
}

export function ObjectiveTracker({
  objective,
  onClose,
  onToggle,
}: {
  objective: DemoObjective;
  onClose: () => void;
  onToggle: (subId: string) => void;
}) {
  const done = objective.subObjectives.filter((s) => s.done).length;
  const pct = Math.round((done / objective.subObjectives.length) * 100);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIO_CLS[objective.priorite]}`}>{objective.priorite.toLowerCase()}</span>
              <span className="text-xs text-muted">{FREQ_LABELS[objective.frequence]}</span>
              <DemoBadge />
            </div>
            <h3 className="text-lg font-semibold text-white">{objective.title}</h3>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Flag size={11} /> {objective.client}
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>Progression</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <p className="label">Sous-objectifs</p>
        <div className="mb-5 space-y-2">
          {objective.subObjectives.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-bg px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              {s.done ? <CheckCircle2 size={16} className="shrink-0 text-emerald-400" /> : <Circle size={16} className="shrink-0 text-muted" />}
              <span className={s.done ? "text-muted line-through" : "text-slate-100"}>{s.title}</span>
            </button>
          ))}
        </div>

        <p className="label flex items-center gap-1.5">
          <Activity size={13} /> Activité
        </p>
        <ol className="mb-5 relative ml-2 space-y-3 border-l border-border pl-4">
          {objective.activity.map((a, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[1.3rem] mt-1 h-2 w-2 rounded-full bg-primary ring-2 ring-surface" />
              <p className="text-sm text-slate-200">
                <span className="font-medium">{a.actor}</span> {a.action}
              </p>
              <p className="text-[10px] text-muted">{formatDateTime(a.at)}</p>
            </li>
          ))}
        </ol>

        <button onClick={() => toast.success("Message envoyé au manager (démo).")} className="btn-ghost w-full">
          <Send size={15} /> Contacter le manager
        </button>
      </div>
    </div>
  );
}
