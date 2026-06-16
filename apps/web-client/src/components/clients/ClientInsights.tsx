"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  CalendarClock,
  ClipboardList,
  Banknote,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatXAF, formatDate } from "@/lib/format";
import { DemoBadge, Skeleton } from "@/components/ui/Misc";
import { ObjectiveTracker, FREQ_LABELS, type DemoObjective, type Frequence } from "@/components/objectives/MyObjectives";

interface AccountLine { code: string; label: string; amount: number }
interface AccountingSummary {
  resultatNet: number;
  charges: { total: number; top: AccountLine[] };
  produits: { total: number; top: AccountLine[] };
  tresorerie: number | null;
}
interface FiscalSummary {
  tvaCollectee: number;
  tvaDeductible: number;
  tvaNette: number;
  isEstime: number;
  derniereDeclaration: { label: string; date: string };
  conformite: number;
}
interface Deadline {
  id: string;
  type: "fiscal" | "legal" | "paiement";
  label: string;
  dueDate: string;
  daysLeft: number;
  status: "TODO" | "EN_COURS" | "COMPLETE";
}

const FREQ_CHIP: Record<Frequence, string> = {
  JOURNALIER: "bg-red-500/15 text-red-400",
  HEBDOMADAIRE: "bg-amber-500/15 text-amber-400",
  MENSUEL: "bg-blue-500/15 text-blue-400",
  ANNUEL: "bg-emerald-500/15 text-emerald-400",
};

// Démo : objectifs liés à ce client (le modèle Objective n'existe pas en base).
type ClientObjective = DemoObjective & { assignee: string; echeance: string };
const SEED_OBJECTIVES: ClientObjective[] = [
  {
    id: "co1",
    title: "Tenue comptable du mois",
    frequence: "MENSUEL",
    priorite: "HAUTE",
    client: "",
    assignee: "Marie-Louise Owono",
    echeance: "2026-07-05",
    subObjectives: [
      { id: "cs1", title: "Saisir les achats", done: true },
      { id: "cs2", title: "Rapprochement bancaire", done: false },
      { id: "cs3", title: "Lettrage clients", done: false },
    ],
    activity: [{ actor: "Manager", action: "a créé l'objectif", at: "2026-06-10T09:00:00Z" }],
  },
  {
    id: "co2",
    title: "Préparer la déclaration TVA",
    frequence: "MENSUEL",
    priorite: "HAUTE",
    client: "",
    assignee: "Yann Foko",
    echeance: "2026-07-15",
    subObjectives: [
      { id: "cs4", title: "Collecter les factures", done: true },
      { id: "cs5", title: "Calculer la TVA nette", done: false },
    ],
    activity: [{ actor: "Manager", action: "a créé l'objectif", at: "2026-06-12T10:00:00Z" }],
  },
];

function progressOf(o: DemoObjective) {
  if (o.subObjectives.length === 0) return 0;
  return Math.round((o.subObjectives.filter((s) => s.done).length / o.subObjectives.length) * 100);
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function ClientInsights({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [acc, setAcc] = useState<AccountingSummary | null>(null);
  const [fiscal, setFiscal] = useState<FiscalSummary | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"compta" | "fiscal">("compta");

  // Objectifs (démo) + tracking.
  const [objectives, setObjectives] = useState<ClientObjective[]>(() => SEED_OBJECTIVES.map((o) => ({ ...o, client: clientName })));
  const [selected, setSelected] = useState<ClientObjective | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [a, f, d] = await Promise.all([
      api.get<AccountingSummary>(`/clients/${clientId}/accounting-summary`),
      api.get<FiscalSummary>(`/clients/${clientId}/fiscal-summary`),
      api.get<{ deadlines: Deadline[] }>(`/clients/${clientId}/deadlines`),
    ]);
    if (a.data) setAcc(a.data);
    if (f.data) setFiscal(f.data);
    if (d.data) setDeadlines(d.data.deadlines);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

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

  const openObjectives = objectives.filter((o) => progressOf(o) < 100);

  if (loading)
    return (
      <div className="mt-8 space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-40" />
      </div>
    );

  return (
    <div className="mt-8 space-y-8">
      {/* ── SECTION 1 — Situation comptable & fiscale ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Situation comptable &amp; fiscale</h2>
        <div className="mb-3 inline-flex rounded-lg border border-border bg-surface p-0.5">
          <button onClick={() => setTab("compta")} className={`rounded-md px-3 py-1 text-sm font-medium ${tab === "compta" ? "bg-primary text-white" : "text-muted hover:text-slate-200"}`}>
            Comptabilité
          </button>
          <button onClick={() => setTab("fiscal")} className={`rounded-md px-3 py-1 text-sm font-medium ${tab === "fiscal" ? "bg-primary text-white" : "text-muted hover:text-slate-200"}`}>
            Fiscalité
          </button>
        </div>

        {tab === "compta" && acc && (
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-[10px] uppercase text-muted">Résultat net de la période</p>
                <p className={`text-xl font-bold ${acc.resultatNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatXAF(acc.resultatNet)}</p>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2 text-right">
                <p className="text-[10px] uppercase text-muted">Trésorerie</p>
                <p className="text-sm font-semibold text-slate-200">{acc.tresorerie != null ? formatXAF(acc.tresorerie) : "Non disponible"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="label flex items-center gap-1.5"><TrendingDown size={13} className="text-red-400" /> Top 5 charges</p>
                {acc.charges.top.length === 0 ? (
                  <p className="text-sm text-muted">Aucune charge.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {acc.charges.top.map((a) => (
                      <li key={a.code} className="flex items-center justify-between text-sm">
                        <span className="truncate text-slate-300"><span className="font-mono text-xs text-muted">{a.code}</span> {a.label}</span>
                        <span className="font-mono text-slate-100">{formatXAF(a.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="label flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-400" /> Top 3 produits</p>
                {acc.produits.top.length === 0 ? (
                  <p className="text-sm text-muted">Aucun produit.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {acc.produits.top.map((a) => (
                      <li key={a.code} className="flex items-center justify-between text-sm">
                        <span className="truncate text-slate-300"><span className="font-mono text-xs text-muted">{a.code}</span> {a.label}</span>
                        <span className="font-mono text-slate-100">{formatXAF(a.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <button onClick={() => toast.message("État financier complet (démo).")} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Wallet size={14} /> Voir l&apos;état complet <ArrowRight size={13} />
            </button>
          </div>
        )}

        {tab === "fiscal" && fiscal && (
          <div className="card space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-[10px] uppercase text-muted">TVA collectée</p>
                <p className="font-mono text-sm text-slate-100">{formatXAF(fiscal.tvaCollectee)}</p>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-[10px] uppercase text-muted">TVA déductible</p>
                <p className="font-mono text-sm text-slate-100">{formatXAF(fiscal.tvaDeductible)}</p>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-[10px] uppercase text-muted">{fiscal.tvaNette >= 0 ? "TVA à reverser" : "Crédit de TVA"}</p>
                <p className={`font-mono text-sm font-bold ${fiscal.tvaNette >= 0 ? "text-amber-400" : "text-emerald-400"}`}>{formatXAF(Math.abs(fiscal.tvaNette))}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase text-muted">IS estimé sur la période <DemoBadge /></p>
                <p className="font-mono text-lg font-bold text-slate-100">{formatXAF(fiscal.isEstime)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted">Conformité fiscale <DemoBadge /></p>
                <p className={`text-lg font-bold ${fiscal.conformite >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{fiscal.conformite}%</p>
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Scale size={12} /> Dernière déclaration : {fiscal.derniereDeclaration.label} — {formatDate(fiscal.derniereDeclaration.date)}
            </p>
          </div>
        )}
      </section>

      {/* ── SECTION 2 — Échéances imminentes ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
          Échéances imminentes <DemoBadge />
        </h2>
        {deadlines.length === 0 ? (
          <p className="text-sm text-muted">Aucune échéance dans les 60 prochains jours.</p>
        ) : (
          <div className="space-y-2">
            {deadlines.map((d) => {
              const Icon = d.type === "fiscal" ? CalendarClock : d.type === "legal" ? ClipboardList : Banknote;
              const badge = d.daysLeft <= 7 ? "bg-red-500/15 text-red-400" : d.daysLeft <= 30 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400";
              const statusLabel = d.status === "TODO" ? "À faire" : d.status === "EN_COURS" ? "En cours" : "Complété";
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-muted"><Icon size={16} /></span>
                    <div>
                      <p className="text-sm font-medium text-slate-100">{d.label}</p>
                      <p className="text-xs text-muted">Échéance : {formatDate(d.dueDate)} · {statusLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}>
                      {d.daysLeft <= 0 ? "Aujourd'hui" : `${d.daysLeft} j`}
                    </span>
                    {d.status === "TODO" && (
                      <button onClick={() => toast.success(`Objectif créé pour « ${d.label} » (démo).`)} className="btn-ghost !py-1.5 text-xs">
                        Démarrer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── SECTION 3 — Objectifs non accomplis ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
          Objectifs non accomplis <DemoBadge />
        </h2>
        {openObjectives.length === 0 ? (
          <p className="text-sm text-muted">Aucun objectif en cours pour ce client.</p>
        ) : (
          <div className="space-y-2">
            {openObjectives.map((o) => {
              const pct = progressOf(o);
              return (
                <div key={o.id} className="rounded-lg border border-border bg-surface p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-100">{o.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FREQ_CHIP[o.frequence]}`}>{FREQ_LABELS[o.frequence]}</span>
                    </div>
                    <span className="text-xs text-muted">Échéance : {formatDate(o.echeance)}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs text-muted">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">{initials(o.assignee)}</span>
                      {o.assignee}
                    </span>
                    <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs text-muted">{pct}%</span>
                    </div>
                    <button onClick={() => setSelected(o)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      Voir le tracking <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selected && <ObjectiveTracker objective={selected} onClose={() => setSelected(null)} onToggle={(subId) => toggleSub(selected.id, subId)} />}
    </div>
  );
}
