"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Wifi,
  Landmark,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Circle,
  RotateCcw,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import { formatXAF, formatDate } from "@/lib/format";
import { ConfidenceBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { DemoBadge } from "@/components/ui/Misc";
import type { DocumentDTO } from "@/lib/types";

export default function ComptabilitePage() {
  const { user } = useAuth();
  // Réservé au client individuel — l'entreprise a son portail dédié (§7).
  if (user?.role === "CLIENT_COMPANY") {
    return (
      <div className="card">
        <p className="text-sm text-slate-300">La comptabilité entreprise est disponible depuis votre portail dédié.</p>
        <Link href="/client/dashboard" className="btn-primary mt-3 inline-flex">
          Aller au tableau de bord
        </Link>
      </div>
    );
  }
  return <ComptaDashboard />;
}

type LeftTab = "apercu" | "charges" | "transactions";
type RightTab = "attente" | "valides" | "upload";
type Health = "green" | "amber" | "red";
interface ChatMessage { id: string; content: string; fromStaff: boolean; createdAt: string }

const monthKey = (d?: string | null) => {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}`;
};

function ComptaDashboard() {
  const [account, setAccount] = useState<{ name: string; referent: string | null } | null>(null);
  const [docs, setDocs] = useState<DocumentDTO[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [left, setLeft] = useState<LeftTab>("apercu");
  const [right, setRight] = useState<RightTab>("attente");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, all, chat] = await Promise.all([
      api.get<{ account: { name: string; referent: string | null } | null; stats: { pending: number } }>("/dashboard"),
      api.get<{ documents: DocumentDTO[] }>("/documents"),
      api.get<{ messages: ChatMessage[] }>("/chat"),
    ]);
    if (d.data?.account) setAccount(d.data.account);
    if (all.data?.documents) setDocs(all.data.documents);
    if (chat.data?.messages) setMessages(chat.data.messages);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const prenom = account?.name?.split(" ")[0] ?? "client";

  // Mois sélectionné (timeline) → filtre les sections à données réelles.
  const filteredDocs = useMemo(
    () => (selectedMonth ? docs.filter((d) => monthKey(d.date ?? d.createdAt) === selectedMonth) : docs),
    [docs, selectedMonth]
  );

  const aggregate = (list: DocumentDTO[]) => {
    const map = new Map<string, { code: string; label: string; total: number }>();
    for (const d of list) {
      if (!d.sysohadaCode || d.amount == null) continue;
      const cur = map.get(d.sysohadaCode) ?? { code: d.sysohadaCode, label: d.sysohadaLabel ?? "", total: 0 };
      cur.total += d.amount;
      map.set(d.sysohadaCode, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  };

  const byAccount = useMemo(() => aggregate(filteredDocs), [filteredDocs]);
  const chargesYtd = useMemo(() => docs.reduce((s, d) => s + (d.sysohadaCode?.startsWith("6") ? d.amount ?? 0 : 0), 0), [docs]);
  const chargesFiltered = byAccount.reduce((s, a) => s + a.total, 0);
  const maxAcct = Math.max(1, ...byAccount.map((a) => a.total));

  // YTD (revenus démo, charges réelles).
  const revenusYtd = 4_230_000;
  const resultat = revenusYtd - chargesYtd;
  const tauxEpargne = revenusYtd > 0 ? Math.round((resultat / revenusYtd) * 100) : 0;
  const chargeRatio = revenusYtd > 0 ? chargesYtd / revenusYtd : 0;

  const enAttente = filteredDocs.filter((d) => d.status === "PENDING_VALIDATION");
  const valides = filteredDocs.filter((d) => d.status === "PUSHED_TO_QBO" || d.status === "APPROVED");

  // ── Complétude du dossier (réel partiel) ──
  const hasRejected = docs.some((d) => d.status === "REJECTED");
  const bankOk = docs.some((d) => (d.sysohadaCode ?? "").startsWith("5") && (d.status === "PUSHED_TO_QBO" || d.status === "APPROVED"));
  const facturesOk = docs.length >= 4;
  const declOk = false; // démo — pas de suivi de déclarations en local
  const completude = (bankOk ? 25 : 0) + (facturesOk ? 25 : 0) + (!hasRejected ? 25 : 0) + (declOk ? 25 : 0);
  const missing: { label: string; href: string }[] = [];
  if (!bankOk) missing.push({ label: "Relevé bancaire manquant", href: "/client/documents" });
  if (!facturesOk) missing.push({ label: "Factures du mois probablement incomplètes", href: "/client/documents" });
  if (hasRejected) missing.push({ label: "Document rejeté à corriger", href: "/client/documents" });
  if (!declOk) missing.push({ label: "Déclaration fiscale du mois à soumettre", href: "/client/tax" });
  const moisActuel = new Date().toLocaleDateString("fr-FR", { month: "long" });

  // ── Prochaine action requise ──
  const nextAction = enAttente.length > 0
    ? { label: `${enAttente.length} document(s) en attente`, href: "/client/documents", days: 5 }
    : hasRejected
      ? { label: "Corriger un document rejeté", href: "/client/documents", days: 3 }
      : completude < 100
        ? { label: "Compléter votre dossier du mois", href: "/client/documents", days: 20 }
        : { label: "Tout est à jour", href: "/client/documents", days: 90 };

  const chargesHealth: Health = chargeRatio > 0.9 ? "red" : chargeRatio >= 0.7 ? "amber" : "green";
  const epargneHealth: Health = tauxEpargne > 20 ? "green" : tauxEpargne >= 10 ? "amber" : "red";
  const actionHealth: Health = nextAction.days < 7 ? "red" : nextAction.days < 30 ? "amber" : "green";

  return (
    <div className="space-y-6">
      {/* Header + switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Comptabilité — {prenom}</h1>
          <div className="mt-2 inline-flex rounded-lg border border-border bg-surface p-0.5">
            <Link href="/client/tax" className="rounded-md px-3 py-1 text-sm font-medium text-muted hover:text-slate-200">
              Fiscalité
            </Link>
            <span className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white">Comptabilité</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
            <Wifi size={14} /> QBO sync ✓ <DemoBadge />
          </span>
          <Link href="/client/documents" className="btn-primary">
            <Upload size={16} /> Uploader
          </Link>
        </div>
      </div>

      {/* §8 — Complétude du dossier */}
      <CompletudeBar month={moisActuel} pct={completude} missing={missing} />

      {/* §1 — Barre d'état (5 cartes santé) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Revenus YTD" value={formatXAF(revenusYtd)} trend={12} badge={{ level: "green", text: "Positif" }} demo />
        <StatCard
          label="Charges YTD"
          value={formatXAF(chargesYtd)}
          trend={8}
          badge={{ level: chargesHealth, text: chargesHealth === "green" ? "Maîtrisées" : chargesHealth === "amber" ? "À surveiller" : "Élevées" }}
        />
        <StatCard label="Résultat net" value={formatXAF(resultat)} badge={{ level: resultat >= 0 ? "green" : "red", text: resultat >= 0 ? "Bénéficiaire" : "Déficitaire" }} sub={resultat >= 0 ? "Bénéficiaire" : "Déficitaire"} demo />
        <StatCard label="Taux d'épargne" value={`${tauxEpargne}%`} badge={{ level: epargneHealth, text: epargneHealth === "green" ? "Excellent" : epargneHealth === "amber" ? "Correct" : "Faible" }} sub="de vos revenus épargnés" demo />
        <StatCard label="Prochaine action" value={nextAction.label} badge={{ level: actionHealth, text: actionHealth === "red" ? "Urgent" : actionHealth === "amber" ? "Bientôt" : "OK" }} action={{ label: "Faire maintenant", href: nextAction.href }} />
      </div>

      {/* §2 — Mon suivi mensuel (timeline) */}
      <MonthlyTimeline
        docs={docs}
        revenusCourant={revenusYtd}
        chargesCourant={chargesYtd}
        selected={selectedMonth}
        onSelect={(k) => setSelectedMonth((cur) => (cur === k ? null : k))}
      />

      {selectedMonth && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-slate-200">
          <span>Sections filtrées sur le mois sélectionné.</span>
          <button onClick={() => setSelectedMonth(null)} className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gauche — revenus & charges */}
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-slate-200">Revenus &amp; charges</p>
          <Tabs
            tabs={[
              { id: "apercu", label: "Aperçu" },
              { id: "charges", label: "Charges détail" },
              { id: "transactions", label: "Transactions" },
            ]}
            active={left}
            onChange={(t) => setLeft(t as LeftTab)}
          />

          {left === "apercu" && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <BarRow label="Revenus" value={revenusYtd} max={Math.max(revenusYtd, chargesFiltered, 1)} color="bg-emerald-500" demo />
                <BarRow label="Charges" value={chargesFiltered} max={Math.max(revenusYtd, chargesFiltered, 1)} color="bg-red-500" />
              </div>
              <div>
                <p className="label">Répartition des charges (SYSCOHADA)</p>
                {byAccount.length === 0 ? (
                  <p className="text-sm text-muted">Aucune charge enregistrée.</p>
                ) : (
                  <div className="space-y-2">
                    {byAccount.slice(0, 5).map((a) => (
                      <div key={a.code}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="text-slate-200">
                            <span className="font-mono text-xs text-muted">{a.code}</span> {a.label}
                          </span>
                          <span className="font-mono text-xs text-slate-100">{formatXAF(a.total)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full bg-primary" style={{ width: `${(a.total / maxAcct) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Trésorerie — démo */}
              <div className="rounded-lg border border-border bg-bg p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">Trésorerie</p>
                  <DemoBadge />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase text-muted">Solde banque</p>
                    <p className="font-mono text-sm text-slate-100">{formatXAF(2_360_000)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted">Projection 90j</p>
                    <p className="font-mono text-sm text-emerald-400">{formatXAF(2_910_000)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted">Décaissements</p>
                    <p className="font-mono text-sm text-red-400">{formatXAF(1_870_000)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {left === "charges" && (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              {byAccount.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">Aucune charge enregistrée.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Compte</th>
                      <th className="px-3 py-2 font-semibold">Libellé</th>
                      <th className="px-3 py-2 text-right font-semibold">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {byAccount.map((a) => (
                      <tr key={a.code}>
                        <td className="px-3 py-2 font-mono text-slate-200">{a.code}</td>
                        <td className="px-3 py-2 text-muted">{a.label}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-100">{formatXAF(a.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {left === "transactions" && (
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {filteredDocs.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted">Aucune transaction.</p>
              ) : (
                filteredDocs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{d.vendor ?? "Document"}</p>
                      <p className="text-[11px] text-muted">
                        <span className="font-mono">{d.sysohadaCode ?? "—"}</span> · {formatDate(d.date)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm text-slate-100">{formatXAF(d.amount)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Droite — documents, état SYSCOHADA, comptable */}
        <div className="space-y-4">
          <div className="card">
            <p className="mb-3 text-sm font-semibold text-slate-200">Documents &amp; validation TCCS</p>
            <Tabs
              tabs={[
                { id: "attente", label: `En attente (${enAttente.length})` },
                { id: "valides", label: `Validés (${valides.length})` },
                { id: "upload", label: "Uploader" },
              ]}
              active={right}
              onChange={(t) => setRight(t as RightTab)}
            />
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {right === "upload" ? (
                <Link
                  href="/client/documents"
                  className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-bg px-3 py-8 text-center hover:bg-surface-2"
                >
                  <Upload size={22} className="text-muted" />
                  <span className="text-sm text-slate-200">Téléverser un reçu ou une facture</span>
                  <span className="text-xs text-muted">Ouvre l&apos;espace documents</span>
                </Link>
              ) : (right === "attente" ? enAttente : valides).length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted">Aucun document.</p>
              ) : (
                (right === "attente" ? enAttente : valides).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{d.vendor ?? "Document"}</p>
                      <p className="text-[11px] text-muted">{formatXAF(d.amount)}</p>
                    </div>
                    {right === "attente" ? <ConfidenceBadge value={d.ocrConfidence} /> : <StatusBadge status={d.status} />}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* État comptable SYSCOHADA */}
          <div className="card">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Landmark size={15} /> État comptable SYSCOHADA
            </p>
            {byAccount.length === 0 ? (
              <p className="text-sm text-muted">Aucune écriture pour le moment.</p>
            ) : (
              <div className="space-y-1.5">
                {byAccount.slice(0, 6).map((a) => (
                  <div key={a.code} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      <span className="font-mono text-xs text-muted">{a.code}</span> {a.label}
                    </span>
                    <span className="font-mono text-slate-100">{formatXAF(a.total)}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                  <span className="font-semibold text-slate-200">Résultat S1</span>
                  <span className="font-mono font-bold text-primary">
                    {formatXAF(resultat)} <DemoBadge />
                  </span>
                </div>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/client/documents" className="btn-ghost px-3 py-1.5 text-xs">
                <FileText size={14} /> Bilan <ArrowRight size={12} />
              </Link>
              <Link href="/client/documents" className="btn-ghost px-3 py-1.5 text-xs">
                <FileText size={14} /> Compte de résultat <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* §7 — Mon comptable */}
          <ComptableWidget referent={account?.referent ?? null} messages={messages} />
        </div>
      </div>
    </div>
  );
}

/* ── §8 Complétude ── */
function CompletudeBar({ month, pct, missing }: { month: string; pct: number; missing: { label: string; href: string }[] }) {
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="card">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">
          Complétude de votre dossier <span className="capitalize">{month}</span> : <span className="text-white">{pct}%</span>
        </p>
        <DemoBadge />
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {missing.length > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
          {missing.map((m, i) => (
            <span key={m.label} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-border">·</span>}
              {m.label}
              <Link href={m.href} className="text-primary hover:underline">Compléter</Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

/* ── §1 Carte santé ── */
const HEALTH: Record<Health, string> = {
  green: "bg-emerald-500/15 text-emerald-400",
  amber: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/15 text-red-400",
};
function StatCard({
  label,
  value,
  trend,
  badge,
  sub,
  action,
  demo,
}: {
  label: string;
  value: string;
  trend?: number;
  badge: { level: Health; text: string };
  sub?: string;
  action?: { label: string; href: string };
  demo?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        {demo ? <DemoBadge /> : <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${HEALTH[badge.level]}`}>{badge.text}</span>}
      </div>
      <p className="truncate text-lg font-bold text-white" title={value}>{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {demo && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${HEALTH[badge.level]}`}>{badge.text}</span>}
        {trend !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {Math.abs(trend)}% <span className="text-muted">vs N-1</span>
          </span>
        )}
        {sub && !trend && <span className="text-[11px] text-muted">{sub}</span>}
      </div>
      {action && (
        <Link href={action.href} className="btn-primary mt-2 justify-center !py-1 text-[11px]">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/* ── §2 Timeline mensuelle ── */
function MonthlyTimeline({
  docs,
  revenusCourant,
  chargesCourant,
  selected,
  onSelect,
}: {
  docs: DocumentDTO[];
  revenusCourant: number;
  chargesCourant: number;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const dt = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    const isCurrent = i === 5;
    // Charges réelles du mois (depuis les documents) ; revenus démo.
    const realCharges = docs.reduce((s, d) => (monthKey(d.date ?? d.createdAt) === key ? s + (d.amount ?? 0) : s), 0);
    const charges = isCurrent ? chargesCourant : realCharges || 1_200_000 + ((dt.getMonth() * 137_000) % 800_000);
    const revenus = isCurrent ? revenusCourant : 3_400_000 + ((dt.getMonth() * 211_000) % 1_300_000);
    const completude: "complet" | "incomplet" | "encours" = isCurrent ? "encours" : dt.getMonth() % 4 === 0 ? "incomplet" : "complet";
    return { key, name: dt.toLocaleDateString("fr-FR", { month: "short" }), revenus, charges, resultat: revenus - charges, isCurrent, completude };
  });
  const max = Math.max(1, ...months.flatMap((m) => [m.revenus, m.charges]));

  const badge = (c: "complet" | "incomplet" | "encours") =>
    c === "complet"
      ? "bg-emerald-500/15 text-emerald-400"
      : c === "incomplet"
        ? "bg-amber-500/15 text-amber-400"
        : "bg-blue-500/15 text-blue-400";
  const badgeLabel = (c: "complet" | "incomplet" | "encours") => (c === "complet" ? "Complet" : c === "incomplet" ? "Incomplet" : "En cours");

  return (
    <div className="card">
      <p className="mb-4 text-sm font-semibold text-slate-200">Mon suivi mensuel <DemoBadge /></p>
      <div className="grid grid-cols-6 gap-2 overflow-x-auto [grid-auto-columns:minmax(56px,1fr)] sm:overflow-visible">
        {months.map((m) => (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className={`flex flex-col items-center gap-2 rounded-lg border p-2 transition-colors ${
              selected === m.key ? "border-primary bg-primary/10" : m.isCurrent ? "border-primary/40 bg-surface-2" : "border-border hover:bg-surface-2"
            }`}
          >
            <span className={`text-xs font-semibold capitalize ${m.isCurrent ? "text-primary" : "text-slate-300"}`}>{m.name}</span>
            <div className="flex h-20 items-end gap-1">
              <div className="w-2.5 rounded-t bg-emerald-500" style={{ height: `${Math.max(4, (m.revenus / max) * 100)}%` }} title={`Revenus ${formatXAF(m.revenus)}`} />
              <div className="w-2.5 rounded-t bg-red-500" style={{ height: `${Math.max(4, (m.charges / max) * 100)}%` }} title={`Charges ${formatXAF(m.charges)}`} />
            </div>
            <span className={`font-mono text-[10px] font-bold ${m.resultat >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {m.resultat >= 0 ? "+" : ""}{Math.round(m.resultat / 1000)}k
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${badge(m.completude)}`}>{badgeLabel(m.completude)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── §7 Widget comptable ── */
function ComptableWidget({ referent, messages }: { referent: string | null; messages: ChatMessage[] }) {
  const last = messages[messages.length - 1];
  const unread = messages.filter((m) => m.fromStaff).length > 0 ? 1 : 0; // démo
  const name = referent ?? "Comptable TCCS";
  return (
    <div className="card">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
        <MessageSquare size={15} /> Mon comptable
      </p>
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-100">
            {name}
            {unread > 0 && <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-400">{unread}</span>}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-emerald-400"><Circle size={6} className="fill-emerald-400" /> En ligne <DemoBadge /></p>
        </div>
      </div>
      {last ? (
        <p className="mt-3 truncate rounded-lg border border-border bg-bg px-3 py-2 text-xs text-slate-300">
          <span className="font-medium text-slate-100">{last.fromStaff ? "TCCS" : "Vous"} : </span>{last.content}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">Aucun message pour le moment.</p>
      )}
      <Link href="/client/chat" className="btn-ghost mt-3 w-full justify-center !py-1.5 text-xs">
        Répondre
      </Link>
    </div>
  );
}

function BarRow({ label, value, max, color, demo }: { label: string; value: number; max: number; color: string; demo?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-200">
          {label} {demo && <DemoBadge />}
        </span>
        <span className="font-mono text-xs text-slate-100">{formatXAF(value)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
      </div>
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
