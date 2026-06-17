"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Calculator,
  Loader2,
  ShieldCheck,
  CalendarClock,
  Wallet,
  Briefcase,
  Home,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Scale,
  Target,
  FileText,
  Circle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import { formatDate, formatXAF } from "@/lib/format";
import { DemoBadge } from "@/components/ui/Misc";

export default function TaxPage() {
  const { user } = useAuth();
  if (user?.role === "CLIENT_COMPANY") return <CompanyTaxView />;
  return <FiscalDashboard />;
}

/* ───────────────── Fiscalité — Client Individuel (REDESIGN §5) ───────────────── */
interface IrppResult {
  totalTax: number;
  effectiveRate: number;
  breakdown: { bracket: string; rate: number; tax: number }[];
}
interface ChatMessage {
  id: string;
  content: string;
  fromStaff: boolean;
  createdAt: string;
}

interface FiscalCompliance {
  clientType: string;
  regime: string;
  demo: boolean;
  deadlines: {
    id: string;
    label: string;
    obligation: string;
    dueDate: string;
    daysLeft: number;
    level: "red" | "amber" | "blue";
    channels: string[];
    demo: boolean;
  }[];
  compliance: {
    score: number;
    riskScore: number;
    riskLevel: "CRITIQUE" | "A_SURVEILLER" | "OK";
    missingPieces: string[];
    actions: string[];
    summary: string;
  };
}

type Tab = "calcul" | "revenus" | "declarations";

const DEMO_ALERTS = [
  { level: "red" as const, title: "Déclaration IRPP à déposer", detail: "Échéance dans 12 jours — DRPP 2024.", action: "Préparer" },
  { level: "amber" as const, title: "Justificatifs manquants", detail: "2 reçus fonciers à téléverser pour déduction.", action: "Téléverser" },
  { level: "blue" as const, title: "Optimisation possible", detail: "Vos frais pro pourraient réduire votre base imposable.", action: "Voir" },
];
const DEMO_GOALS = [
  { title: "Conformité fiscale 2024", pct: 80, status: "En cours" },
  { title: "Constituer une épargne", pct: 45, status: "En cours" },
  { title: "Achat immobilier", pct: 20, status: "Planifié" },
];

function FiscalDashboard() {
  const [account, setAccount] = useState<{ name: string; referent: string | null; country: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [income, setIncome] = useState(4_230_000);
  const [result, setResult] = useState<IrppResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("calcul");

  const runIrpp = useCallback(async (value: number) => {
    setBusy(true);
    const { data, error } = await api.post<IrppResult>("/tax/irpp", { income: value });
    setBusy(false);
    if (error) return toast.error(error);
    setResult(data!);
  }, []);

  const load = useCallback(async () => {
    const [d, c] = await Promise.all([
      api.get<{ account: { name: string; referent: string | null; country: string } | null }>("/dashboard"),
      api.get<{ messages: ChatMessage[] }>("/chat"),
    ]);
    if (d.data?.account) setAccount(d.data.account);
    if (c.data?.messages) setMessages(c.data.messages);
  }, []);

  useEffect(() => {
    load();
    runIrpp(4_230_000);
  }, [load, runIrpp]);

  const prenom = account?.name?.split(" ")[0] ?? "client";

  return (
    <div className="space-y-6">
      {/* Header + switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Bonjour, {prenom}</h1>
          <div className="mt-2 inline-flex rounded-lg border border-border bg-surface p-0.5">
            <span className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white">Fiscalité</span>
            <Link href="/client/comptabilite" className="rounded-md px-3 py-1 text-sm font-medium text-muted hover:text-slate-200">
              Comptabilité
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
            <ShieldCheck size={14} /> Conformité 100% <DemoBadge />
          </span>
          <button onClick={() => toast.success("Préparation de la DRPP lancée (démo).")} className="btn-primary">
            <FileText size={16} /> Préparer DRPP
          </button>
        </div>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Revenus déclarés" value={formatXAF(income)} icon={<TrendingUp size={16} />} />
        <Metric label="IRPP estimé" value={result ? formatXAF(result.totalTax) : "…"} icon={<Calculator size={16} />} accent />
        <Metric label="Conformité" value="100%" icon={<ShieldCheck size={16} />} demo />
        <Metric label="Prochaine échéance" value="12 j" icon={<CalendarClock size={16} />} demo />
      </div>

      <FiscalCompliancePanel />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gauche — simulation IRPP */}
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-slate-200">Simulation IRPP 2024</p>
          <Tabs
            tabs={[
              { id: "calcul", label: "Calcul IRPP" },
              { id: "revenus", label: "Mes revenus" },
              { id: "declarations", label: "Déclarations" },
            ]}
            active={tab}
            onChange={(t) => setTab(t as Tab)}
          />

          {tab === "calcul" && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Revenu annuel imposable (XAF)</label>
                <div className="flex gap-2">
                  <input className="input font-mono" type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} />
                  <button onClick={() => runIrpp(income)} disabled={busy} className="btn-primary shrink-0">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />}
                  </button>
                </div>
              </div>
              {result ? (
                <>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Tranche</th>
                          <th className="px-3 py-2 font-semibold">Taux</th>
                          <th className="px-3 py-2 text-right font-semibold">Impôt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {result.breakdown.map((b, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-300">{b.bracket}</td>
                            <td className="px-3 py-2 text-muted">{(b.rate * 100).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-200">{formatXAF(b.tax)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5">
                    <span className="text-sm text-muted">Total estimé · taux effectif {(result.effectiveRate * 100).toFixed(1)}%</span>
                    <span className="font-mono text-lg font-bold text-primary">{formatXAF(result.totalTax)}</span>
                  </div>
                  <LegalChip source="CGI CM Art.25 — barème progressif IRPP" />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => toast.success("DRPP préparée (démo).")} className="btn-ghost">
                      <FileText size={15} /> Préparer DRPP
                    </button>
                    <button onClick={() => toast.success("Pistes d'optimisation générées (démo).")} className="btn-ghost">
                      <TrendingUp size={15} /> Optimiser <DemoBadge />
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">Calcul en cours…</p>
              )}
            </div>
          )}

          {tab === "revenus" && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-end">
                <DemoBadge />
              </div>
              {[
                { icon: <Wallet size={15} />, label: "Salaire", amount: 3_000_000, retenu: true },
                { icon: <Briefcase size={15} />, label: "Freelance", amount: 900_000, retenu: false },
                { icon: <Home size={15} />, label: "Revenus fonciers", amount: 330_000, retenu: false },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="text-muted">{r.icon}</span> {r.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-100">{formatXAF(r.amount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${r.retenu ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                      {r.retenu ? "retenu à la source" : "à déclarer"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "declarations" && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-end">
                <DemoBadge />
              </div>
              {[
                { year: "DRPP 2023", status: "Déposée", cls: "bg-emerald-500/15 text-emerald-400" },
                { year: "TVA juin 2024", status: "En cours", cls: "bg-amber-500/15 text-amber-400" },
                { year: "DRPP 2024", status: "À venir", cls: "bg-blue-500/15 text-blue-400" },
              ].map((d) => (
                <div key={d.year} className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2.5">
                  <span className="text-sm text-slate-200">{d.year}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${d.cls}`}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Droite — alertes, accompagnement, objectifs */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <AlertTriangle size={15} /> Veille fiscale
              </p>
              <DemoBadge />
            </div>
            <div className="space-y-2">
              {DEMO_ALERTS.map((a) => {
                const cls =
                  a.level === "red"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : a.level === "amber"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-300";
                return (
                  <div key={a.title} className={`rounded-lg border p-3 ${cls}`}>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs opacity-80">{a.detail}</p>
                    <button
                      onClick={() => toast.success(`${a.action} (démo).`)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    >
                      {a.action} <ArrowRight size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <p className="mb-3 text-sm font-semibold text-slate-200">Accompagnement TCCS</p>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {(account?.referent ?? "TCCS").slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{account?.referent ?? "Comptable TCCS"}</p>
                <p className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <Circle size={7} className="fill-emerald-400" /> En ligne <DemoBadge />
                </p>
              </div>
              <Link href="/client/chat" className="btn-ghost ml-auto shrink-0 px-3 py-1.5 text-xs">
                <MessageSquare size={14} /> Écrire
              </Link>
            </div>
            <p className="label mt-3">Derniers messages</p>
            {messages.length === 0 ? (
              <p className="text-sm text-muted">Aucun message pour le moment.</p>
            ) : (
              <ul className="space-y-1.5">
                {messages.slice(-2).map((m) => (
                  <li key={m.id} className="truncate rounded-lg border border-border bg-bg px-3 py-2 text-xs text-slate-300">
                    <span className="font-medium text-slate-100">{m.fromStaff ? "TCCS" : "Vous"} : </span>
                    {m.content}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Target size={15} /> Objectifs &amp; patrimoine
              </p>
              <DemoBadge />
            </div>
            <div className="space-y-3">
              {DEMO_GOALS.map((g) => (
                <div key={g.title}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-200">{g.title}</span>
                    <span className="text-xs text-muted">{g.status}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full ${g.pct >= 80 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  accent,
  demo,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: boolean;
  demo?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-1 flex items-center justify-between text-muted">
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
        {demo ? <DemoBadge /> : icon}
      </div>
      <p className={`text-lg font-bold ${accent ? "text-primary" : "text-white"}`}>{value}</p>
    </div>
  );
}

function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            active === t.id ? "bg-primary/15 text-primary" : "text-muted hover:bg-surface-2 hover:text-slate-200"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function LegalChip({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-muted">
      <Scale size={11} /> {source}
    </span>
  );
}

/* ───────────────── Comptabilité — Client Entreprise (TVA/IS, inchangé) ───────────────── */
function CompanyTaxView() {
  return (
    <div className="space-y-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-white">Simulateur fiscal</h1>
      <p className="mb-6 text-sm text-muted">
        Estimez votre TVA et votre impôt sur les sociétés. <span className="text-xs">(estimation indicative)</span>
      </p>
      <FiscalCompliancePanel />
      <VatSimulator />
    </div>
  );
}

function FiscalCompliancePanel() {
  const [data, setData] = useState<FiscalCompliance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<FiscalCompliance>("/tax/compliance");
    if (error) setError(error);
    else setData(data!);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card h-36 animate-pulse" />
        <div className="card h-36 animate-pulse lg:col-span-2" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
        Impossible de charger l'assistant fiscal. {error}
      </div>
    );
  }

  const score = data.compliance.score;
  const scoreColor = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <ShieldCheck size={15} /> Assistant conformite
          </p>
          <DemoBadge />
        </div>
        <p className={`text-3xl font-bold ${scoreColor}`}>{score}%</p>
        <p className="mt-1 text-xs text-muted">{data.regime}</p>
        <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-slate-300">{data.compliance.summary}</p>
      </div>

      <div className="card lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <CalendarClock size={15} /> Calendrier fiscal Cameroun
          </p>
          <span className="text-xs text-muted">Rappels WhatsApp + email <DemoBadge /></span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {data.deadlines.slice(0, 4).map((item) => {
            const cls =
              item.level === "red"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : item.level === "amber"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300";
            return (
              <div key={item.id} className={`rounded-lg border px-3 py-2 ${cls}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-[11px] opacity-80">
                      {formatDate(item.dueDate)} - {item.channels.join(" + ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold">
                    J-{Math.max(0, item.daysLeft)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <AlertTriangle size={15} /> Actions prioritaires
          </p>
          <span className="text-xs text-muted">Risque {data.compliance.riskScore}/100</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <p className="label">Pieces a fournir</p>
            <ul className="space-y-1.5">
              {data.compliance.missingPieces.map((piece) => (
                <li key={piece} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-slate-300">
                  {piece}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label">Prochaines actions</p>
            <ul className="space-y-1.5">
              {data.compliance.actions.map((action) => (
                <li key={action} className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-slate-300">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function VatSimulator() {
  const [turnover, setTurnover] = useState(50_000_000);
  const [expenses, setExpenses] = useState(20_000_000);
  const [result, setResult] = useState<{ rate: number; vatCollected: number; vatDeductible: number; vatDue: number; corporateTax: { taxDue: number; appliedRule: string } } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const { data, error } = await api.post<typeof result>("/tax/vat", { turnover, expenses, country: "CM" });
    setBusy(false);
    if (error) return toast.error(error);
    setResult(data!);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card space-y-4">
        <div>
          <label className="label">Chiffre d&apos;affaires (XAF)</label>
          <input className="input font-mono" type="number" value={turnover} onChange={(e) => setTurnover(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Charges déductibles (XAF)</label>
          <input className="input font-mono" type="number" value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} />
        </div>
        <button onClick={run} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />} Calculer
        </button>
      </div>
      <div className="card">
        {result ? (
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-sm text-muted">TVA collectée</span><span className="font-mono text-slate-200">{formatXAF(result.vatCollected)}</span></div>
            <div className="flex justify-between"><span className="text-sm text-muted">TVA déductible</span><span className="font-mono text-slate-200">{formatXAF(result.vatDeductible)}</span></div>
            <div className="flex justify-between border-t border-border pt-3"><span className="text-sm font-semibold text-slate-200">TVA à payer</span><span className="font-mono font-bold text-primary">{formatXAF(result.vatDue)}</span></div>
            <div className="mt-4 rounded-lg bg-surface-2 p-3">
              <p className="text-sm text-muted">Impôt sur les sociétés (estimé)</p>
              <p className="text-2xl font-bold text-amber-400">{formatXAF(result.corporateTax.taxDue)}</p>
              <p className="text-xs text-muted">Règle appliquée : {result.corporateTax.appliedRule === "minimum" ? "minimum forfaitaire" : "taux statutaire"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Saisissez vos chiffres puis cliquez sur « Calculer ».</p>
        )}
      </div>
    </div>
  );
}
