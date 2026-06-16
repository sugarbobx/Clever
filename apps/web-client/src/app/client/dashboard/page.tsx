"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle2,
  MessageCircle,
  LayoutDashboard,
  Files,
  BarChart3,
  Building2,
  ShieldCheck,
  Landmark,
  AlertTriangle,
  CalendarClock,
  XCircle,
  Plus,
  MessageSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import type { DocumentDTO, SubscriptionTier } from "@/lib/types";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { UsageMeter, TierBadge, TIER_LABELS } from "@/components/subscription/Tier";
import { StatusBadge, ConfidenceBadge } from "@/components/ui/StatusBadge";
import { Skeleton, ErrorState, EmptyState, DemoBadge } from "@/components/ui/Misc";
import { NiuBanner } from "@/components/niu/NiuBanner";
import { formatXAF, formatDate } from "@/lib/format";

interface ClientDash {
  account: { name: string; type: string; tier: SubscriptionTier; documentCount: number; country: string; referent: string | null } | null;
  stats: { totalDocuments: number; pushedToQbo: number; pending: number };
  recent: DocumentDTO[];
}

const TIER_LIMIT: Record<SubscriptionTier, number | null> = {
  DECLARANT_SOLO: 30,
  COMPTABLE_PRO: null,
  GRAND_COMPTE: null,
};

export default function ClientDashboard() {
  const { user } = useAuth();
  return (
    <>
      {user && <NiuBanner userId={user.id} />}
      {user?.role === "CLIENT_COMPANY" ? <EntreprisePortal /> : <IndividualDashboard />}
    </>
  );
}

/* ───────────────── Client individuel (existant, conservé) ───────────────── */
function IndividualDashboard() {
  const [d, setD] = useState<ClientDash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<ClientDash>("/dashboard");
    if (error) setError(error);
    else setD(data!);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (loading || !d)
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Bonjour, {d.account?.name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted">Comptable référent : {d.account?.referent ?? "Non assigné"}</p>
        </div>
        {d.account && <TierBadge tier={d.account.tier} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Documents envoyés" value={d.stats.totalDocuments} icon={<FileText size={18} />} />
        <StatsCard label="Traités" value={d.stats.pushedToQbo} icon={<CheckCircle2 size={18} />} accent />
        {d.account && <UsageMeter used={d.account.documentCount} limit={TIER_LIMIT[d.account.tier]} />}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/client/documents" className="btn-primary">
          <Upload size={16} /> Soumettre un document
        </Link>
        <Link href="/client/chat" className="btn-ghost">
          <MessageCircle size={16} /> Contacter mon comptable
        </Link>
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Documents récents</h2>
        {d.stats.pending > 0 && (
          <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
            {d.stats.pending} en attente de validation
          </span>
        )}
      </div>
      {d.recent.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} />}
          title="Aucun document"
          desc="Envoyez votre premier reçu pour démarrer."
          action={
            <Link href="/client/documents" className="btn-primary">
              <Upload size={16} /> Envoyer un document
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {d.recent.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{doc.vendor}</p>
                <p className="text-xs text-muted">{formatDate(doc.date)} · {formatXAF(doc.amount)}</p>
              </div>
              <StatusBadge status={doc.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Portail Entreprise (REDESIGN §7) ───────────────── */
const SECTIONS = [
  { id: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard size={15} /> },
  { id: "docs", label: "Mes documents", icon: <Files size={15} /> },
  { id: "finance", label: "État financier", icon: <BarChart3 size={15} /> },
  { id: "services", label: "Services TCCS", icon: <Building2 size={15} /> },
  { id: "conformite", label: "Conformité OHADA", icon: <ShieldCheck size={15} /> },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const INCLUDED_SERVICES = [
  "Tenue comptable SYSCOHADA",
  "Déclarations fiscales (TVA, IS, DSF)",
  "Paie & CNPS mensuel",
  "Conformité OHADA (RCCM, statuts, registres)",
  "Chat sécurisé avec comptable assigné",
  "Alertes intelligentes 30j avant échéances",
];
const PREMIUM_SERVICES = [
  "Commissariat aux comptes",
  "Évaluation d'entreprise",
  "Business plan & prévisionnel",
  "Assistance contrôle fiscal DGI",
  "Modification statutaire OHADA",
  "Dossier de financement bancaire",
];
const OHADA_CHECKLIST = [
  { label: "RCCM à jour", ok: true },
  { label: "Statuts déposés", ok: true },
  { label: "PV d'AG annuelle", ok: false },
  { label: "Registres légaux", ok: true },
  { label: "Dépôt des comptes (DSF)", ok: true },
];
const OHADA_CALENDAR = [
  { label: "Déclaration TVA", date: "15/07/2026", level: "amber" as const },
  { label: "Acompte IS", date: "15/09/2026", level: "blue" as const },
  { label: "DSF annuelle", date: "15/03/2027", level: "blue" as const },
  { label: "Cotisations CNPS", date: "15/07/2026", level: "amber" as const },
];
interface ChatMessage { id: string; content: string; fromStaff: boolean; createdAt: string }

function EntreprisePortal() {
  const [section, setSection] = useState<SectionId>("overview");
  const [d, setD] = useState<ClientDash | null>(null);
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [dash, all, chat] = await Promise.all([
      api.get<ClientDash>("/dashboard"),
      api.get<{ documents: DocumentDTO[] }>("/documents"),
      api.get<{ messages: ChatMessage[] }>("/chat"),
    ]);
    if (dash.error) setError(dash.error);
    else setD(dash.data!);
    if (all.data?.documents) setDocs(all.data.documents);
    if (chat.data?.messages) setMessages(chat.data.messages);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byAccount = useMemo(() => {
    const map = new Map<string, { code: string; label: string; total: number }>();
    for (const doc of docs) {
      if (!doc.sysohadaCode || doc.amount == null) continue;
      const cur = map.get(doc.sysohadaCode) ?? { code: doc.sysohadaCode, label: doc.sysohadaLabel ?? "", total: 0 };
      cur.total += doc.amount;
      map.set(doc.sysohadaCode, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [docs]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (loading || !d)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );

  const tier = d.account?.tier ?? "COMPTABLE_PRO";
  const isGrandCompte = tier === "GRAND_COMPTE";
  const enAttente = docs.filter((x) => x.status === "PENDING_VALIDATION");
  const valides = docs.filter((x) => x.status === "PUSHED_TO_QBO" || x.status === "APPROVED");
  const rejetes = docs.filter((x) => x.status === "REJECTED");
  const ohadaScore = Math.round((OHADA_CHECKLIST.filter((c) => c.ok).length / OHADA_CHECKLIST.length) * 100);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Building2 size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{d.account?.name}</h1>
            <p className="text-xs text-muted">Comptable référent : {d.account?.referent ?? "Non assigné"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {d.account && <TierBadge tier={d.account.tier} />}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
            <ShieldCheck size={14} /> QBO sync <DemoBadge />
          </span>
          <Link href="/client/documents" className="btn-primary">
            <Upload size={16} /> Uploader
          </Link>
        </div>
      </div>

      {/* Pills navigation */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              section === s.id ? "bg-primary text-white" : "border border-border text-muted hover:text-slate-200"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── Vue d'ensemble ── */}
      {section === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Metric label="Documents" value={d.stats.totalDocuments} icon={<FileText size={16} />} />
            <Metric label="Traités" value={d.stats.pushedToQbo} icon={<CheckCircle2 size={16} />} accent />
            <Metric label="En attente" value={d.stats.pending} icon={<AlertTriangle size={16} />} />
            <Metric label="Conformité OHADA" value={`${ohadaScore}%`} icon={<ShieldCheck size={16} />} demo />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <p className="mb-3 text-sm font-semibold text-slate-200">Activité récente</p>
              {d.recent.length === 0 ? (
                <p className="text-sm text-muted">Aucune activité.</p>
              ) : (
                <div className="space-y-2">
                  {d.recent.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{doc.vendor}</p>
                        <p className="text-[11px] text-muted">{formatDate(doc.date)} · {formatXAF(doc.amount)}</p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="card">
                <div className="mb-3 flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <MessageSquare size={15} /> Mon comptable
                  </p>
                  <Link href="/client/chat" className="text-xs text-primary hover:underline">Écrire →</Link>
                </div>
                {messages.length === 0 ? (
                  <p className="text-sm text-muted">Aucun message.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {messages.slice(-3).map((m) => (
                      <li key={m.id} className="truncate rounded-lg border border-border bg-bg px-3 py-2 text-xs text-slate-300">
                        <span className="font-medium text-slate-100">{m.fromStaff ? "TCCS" : "Vous"} : </span>
                        {m.content}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="card">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">Dossiers en cours</p>
                  <DemoBadge />
                </div>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li className="flex items-center justify-between"><span>Clôture exercice 2025</span><span className="text-xs text-amber-400">En cours</span></li>
                  <li className="flex items-center justify-between"><span>Déclaration TVA juin</span><span className="text-xs text-blue-400">À déposer</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mes documents ── */}
      {section === "docs" && (
        <div className="space-y-4">
          <Link
            href="/client/documents"
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-bg px-3 py-6 text-center hover:bg-surface-2"
          >
            <Upload size={22} className="text-muted" />
            <span className="text-sm text-slate-200">Téléverser un document</span>
          </Link>
          <DocGroup title={`En attente (${enAttente.length})`} docs={enAttente} mode="confidence" />
          <DocGroup title={`Validés (${valides.length})`} docs={valides} mode="status" />
          <DocGroup title={`Rejetés (${rejetes.length})`} docs={rejetes} mode="rejected" />
        </div>
      )}

      {/* ── État financier ── */}
      {section === "finance" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Landmark size={15} /> Comptes SYSCOHADA
            </p>
            {byAccount.length === 0 ? (
              <p className="text-sm text-muted">Aucune écriture.</p>
            ) : (
              <div className="space-y-1.5">
                {byAccount.slice(0, 8).map((a) => (
                  <div key={a.code} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300"><span className="font-mono text-xs text-muted">{a.code}</span> {a.label}</span>
                    <span className="font-mono text-slate-100">{formatXAF(a.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Trésorerie multi-banques</p>
              <DemoBadge />
            </div>
            <div className="space-y-2">
              {[
                { bank: "Afriland First Bank", solde: 12_400_000 },
                { bank: "SGBC", solde: 4_750_000 },
                { bank: "Caisse", solde: 320_000 },
              ].map((b) => (
                <div key={b.bank} className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2">
                  <span className="text-sm text-slate-200">{b.bank}</span>
                  <span className="font-mono text-sm text-slate-100">{formatXAF(b.solde)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-surface-2 p-3">
              <p className="text-xs text-muted">Flux prévisionnel J+30</p>
              <p className="text-lg font-bold text-emerald-400">{formatXAF(2_180_000)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Services TCCS ── */}
      {section === "services" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <p className="mb-3 text-sm font-semibold text-emerald-300">Inclus dans votre forfait {TIER_LABELS[tier]}</p>
            <ul className="space-y-2">
              {INCLUDED_SERVICES.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-slate-200">
                  <CheckCircle2 size={15} className="shrink-0 text-emerald-400" /> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">{isGrandCompte ? "Inclus (Grand Compte)" : "Services à la demande"}</p>
              {!isGrandCompte && <DemoBadge />}
            </div>
            <ul className="space-y-2">
              {PREMIUM_SERVICES.map((s) => (
                <li key={s} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-200">
                    {isGrandCompte ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Plus size={15} className="text-primary" />}
                    {s}
                  </span>
                  {!isGrandCompte && (
                    <button onClick={() => toast.success(`Demande envoyée à TCCS : ${s} (démo).`)} className="text-xs font-semibold text-primary hover:underline">
                      Demander
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Conformité OHADA ── */}
      {section === "conformite" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Score de conformité</p>
              <DemoBadge />
            </div>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{ohadaScore}%</span>
              <span className="text-xs text-muted">{OHADA_CHECKLIST.filter((c) => c.ok).length}/{OHADA_CHECKLIST.length} obligations</span>
            </div>
            <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className={`h-full ${ohadaScore >= 80 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${ohadaScore}%` }} />
            </div>
            <ul className="space-y-2">
              {OHADA_CHECKLIST.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-sm">
                  {c.ok ? <CheckCircle2 size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-red-400" />}
                  <span className={c.ok ? "text-slate-200" : "text-red-300"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <CalendarClock size={15} /> Calendrier des obligations légales <DemoBadge />
            </p>
            <div className="space-y-2">
              {OHADA_CALENDAR.map((o) => (
                <div
                  key={o.label}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    o.level === "amber" ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                  }`}
                >
                  <span>{o.label}</span>
                  <span className="font-mono text-xs">{o.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocGroup({ title, docs, mode }: { title: string; docs: DocumentDTO[]; mode: "confidence" | "status" | "rejected" }) {
  return (
    <div className="card">
      <p className="mb-3 text-sm font-semibold text-slate-200">{title}</p>
      {docs.length === 0 ? (
        <p className="text-sm text-muted">Aucun document.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-border bg-bg px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{doc.vendor ?? "Document"}</p>
                  <p className="text-[11px] text-muted">{formatDate(doc.date)} · {formatXAF(doc.amount)}</p>
                </div>
                {mode === "confidence" ? <ConfidenceBadge value={doc.ocrConfidence} /> : <StatusBadge status={doc.status} />}
              </div>
              {mode === "rejected" && doc.validation?.notes && (
                <p className="mt-1.5 rounded bg-red-500/10 px-2 py-1 text-xs text-red-300">Motif : {doc.validation.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
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
