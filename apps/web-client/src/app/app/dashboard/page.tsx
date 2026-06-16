"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Inbox,
  FileText,
  CheckCircle2,
  Users,
  MessageCircle,
  Loader2,
  AlertTriangle,
  Activity,
  Wifi,
  Plus,
  Building2,
  User as UserIcon,
  ShieldCheck,
  Gauge,
  Target,
  MessageSquare,
  Send,
  X,
  Pencil,
  Lock,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ConfidenceBadge } from "@/components/ui/StatusBadge";
import { Skeleton, DemoBadge, ErrorState } from "@/components/ui/Misc";
import { TIER_LABELS, TierBadge } from "@/components/subscription/Tier";
import { formatXAF, formatDateTime } from "@/lib/format";
import { ROLE_LABELS, type DocumentDTO, type Role, type SubscriptionTier } from "@/lib/types";

interface StaffStats {
  pendingValidation: number;
  totalDocuments: number;
  pushedToQbo: number;
  activeClients: number;
  estimatedMrrXaf: number;
}

interface ManagerClientRow {
  id: string;
  name: string;
  subscriptionTier: SubscriptionTier;
  documentCount: number;
  qboActive: boolean;
  lastActivity: string;
}

interface ManagerData {
  alerts: { level: "red" | "amber"; message: string }[];
  activity: { id: string; actorName: string; action: string; detail: string | null; createdAt: string }[];
  daily: { date: string; count: number }[];
  clientsByTier: Record<string, number>;
  qboErrors: number;
  docsThisMonth: number;
  activeQbo: number;
  totalClients: number;
  clients: ManagerClientRow[];
}

interface StaffMember {
  id: string;
  name: string;
  role: Role;
}

interface ClientRow {
  id: string;
  name: string;
  type: "INDIVIDUAL" | "COMPANY";
  subscriptionTier: SubscriptionTier;
  assignedStaff?: { name: string } | null;
  qboConnection?: { isActive: boolean } | null;
  _count?: { documents: number };
}

const ACTION_LABELS: Record<string, string> = {
  VALIDATION_APPROVED: "a approuvé un document",
  VALIDATION_REJECTED: "a rejeté un document",
  CLIENT_CREATED: "a créé un client",
  CLIENT_TIER_CHANGED: "a changé un forfait",
  CLIENT_TIER_UPDATED: "a changé un forfait",
  DOCUMENT_UPLOADED: "a téléversé un document",
  QBO_CONNECTED: "a connecté QuickBooks",
};

// Tarifs / limites par forfait — alignés sur CLAUDE.md §11 (dérivés côté front, démo).
const TIER_PRICE: Record<SubscriptionTier, number> = {
  DECLARANT_SOLO: 19900,
  COMPTABLE_PRO: 59900,
  GRAND_COMPTE: 199000,
};
const TIER_LIMIT: Record<SubscriptionTier, number | null> = {
  DECLARANT_SOLO: 30,
  COMPTABLE_PRO: null,
  GRAND_COMPTE: null,
};
const DELEGABLE_CAPS = ["CAN_ASSIGN_TRAINEE", "CAN_EXPORT_DATA", "CAN_VIEW_ALL_CLIENTS"] as const;
// Stagiaires gérables — démo (les TRAINEE ne sont pas renvoyés par /staff).
const DEMO_TEAM_TRAINEES = [
  { id: "t1", name: "Yann Foko" },
  { id: "t2", name: "Ange Ndoumbe" },
  { id: "t3", name: "Carine Mballa" },
];
const TRAINEE_CATEGORIES = [
  "FACTURE_FOURNISSEUR",
  "FACTURE_CLIENT",
  "NDF",
  "RELEVE_BANCAIRE",
  "BULLETIN_PAIE",
  "DECLARATION_FISCALE",
  "CONTRAT",
  "RECU_CAISSE",
  "JUSTIFICATIF_DOUANE",
];
interface TraineePerms {
  allowedCategories: string[];
  canSubmitForApproval: boolean;
  canViewAllDocuments: boolean;
  canContactClient: boolean;
  maxDocumentsPerDay: number;
}

export default function StaffDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [mgr, setMgr] = useState<ManagerData | null>(null);
  const [pending, setPending] = useState<DocumentDTO[]>([]);
  const [validated, setValidated] = useState<DocumentDTO[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [team, setTeam] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const role = user?.role;
  const isManager = role === "MANAGER_N2";
  const isEmployee = role === "EMPLOYEE";
  const isTrainee = role === "TRAINEE";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<{ stats: StaffStats; manager?: ManagerData }>("/dashboard");
    if (error) {
      setError(error);
      setLoading(false);
      return;
    }
    setStats(data!.stats);
    setMgr(data!.manager ?? null);
    // Colonnes staff hydratées via endpoints existants (chaque appel restreint au rôle autorisé).
    if (role === "MANAGER_N2" || role === "EMPLOYEE" || role === "TRAINEE") {
      const canListClients = role === "MANAGER_N2" || role === "EMPLOYEE";
      const [p, c, s, v] = await Promise.all([
        api.get<{ documents: DocumentDTO[] }>("/documents?status=PENDING_VALIDATION"),
        canListClients
          ? api.get<{ clients: ClientRow[] }>("/clients")
          : Promise.resolve({ data: { clients: [] as ClientRow[] }, error: null }),
        role === "MANAGER_N2"
          ? api.get<{ staff: StaffMember[] }>("/staff")
          : Promise.resolve({ data: { staff: [] as StaffMember[] }, error: null }),
        role === "EMPLOYEE"
          ? api.get<{ documents: DocumentDTO[] }>("/documents?status=PUSHED_TO_QBO")
          : Promise.resolve({ data: { documents: [] as DocumentDTO[] }, error: null }),
      ]);
      setPending(p.data?.documents ?? []);
      setClients(c.data?.clients ?? []);
      setTeam(s.data?.staff ?? []);
      setValidated(v.data?.documents ?? []);
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  async function simulate() {
    setSimulating(true);
    const { data, error } = await api.post<{ document: { vendor: string; amount: number } }>("/demo/simulate-receipt", {});
    setSimulating(false);
    if (error) return toast.error(error);
    toast.success(`Reçu reçu : ${data!.document.vendor} — ${formatXAF(data!.document.amount)}`);
    load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isManager ? "THECLEVEREST Consulting" : isEmployee || isTrainee ? user?.name : "Tableau de bord"}
          </h1>
          <p className="text-sm text-muted">
            {isManager
              ? "Pilotage du cabinet — portefeuille, équipe et conformité."
              : isEmployee
                ? "Collaborateur · votre file, vos dossiers et vos objectifs."
                : isTrainee
                  ? "Stagiaire · vos tâches assignées et votre progression."
                  : "Vue d'ensemble de l'activité du cabinet."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(isEmployee || isTrainee) && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
                <Gauge size={14} /> Perf {isTrainee ? "91" : "98"}% <DemoBadge />
              </span>
              {stats && stats.pendingValidation > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300">
                  <Inbox size={14} /> {stats.pendingValidation} {isTrainee ? "tâches" : "en attente"}
                </span>
              )}
            </>
          )}
          {isManager && mgr && mgr.alerts.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-300">
              <AlertTriangle size={14} /> {mgr.alerts.length} alerte{mgr.alerts.length > 1 ? "s" : ""}
            </span>
          )}
          <button onClick={simulate} disabled={simulating} className="btn-ghost">
            {simulating ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
            Simuler réception <DemoBadge />
          </button>
          {isManager && (
            <Link href="/app/clients/new" className="btn-primary">
              <Plus size={16} /> Nouveau client
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : isManager && mgr ? (
        <ManagerDashboard stats={stats!} mgr={mgr} pending={pending} team={team} />
      ) : isEmployee ? (
        <EmployeeDashboard stats={stats!} pending={pending} validated={validated} clients={clients} />
      ) : isTrainee ? (
        <TraineeDashboard stats={stats!} pending={pending} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard label="À valider" value={stats!.pendingValidation} accent icon={<Inbox size={18} />} hint="Documents en attente" />
            <StatsCard label="Documents traités" value={stats!.pushedToQbo} icon={<CheckCircle2 size={18} />} hint="Poussés vers QuickBooks" />
            <StatsCard label="Total documents" value={stats!.totalDocuments} icon={<FileText size={18} />} />
            <StatsCard label="Clients actifs" value={stats!.activeClients} icon={<Users size={18} />} />
          </div>
          <div className="mt-6 flex gap-3">
            <button onClick={() => router.push("/app/queue")} className="btn-ghost">
              <Inbox size={16} /> Ouvrir la file de validation
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────── Manager dashboard — REDESIGN §2 ───────────────── */
function ManagerDashboard({
  stats,
  mgr,
  pending,
  team,
}: {
  stats: StaffStats;
  mgr: ManagerData;
  pending: DocumentDTO[];
  team: StaffMember[];
}) {
  // "Limite" — clients Déclarant Solo proches du plafond mensuel (réel, dérivé de la table clients).
  const nearLimit = mgr.clients.filter((c) => {
    const lim = TIER_LIMIT[c.subscriptionTier];
    return lim != null && c.documentCount >= Math.floor(lim * 0.9);
  }).length;
  // Conformité OHADA — non stockée en base → démo dérivée du ratio QBO connectés.
  const conformite = mgr.totalClients > 0 ? Math.round((mgr.activeQbo / mgr.totalClients) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Métriques top */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Metric label="Clients" value={mgr.totalClients} icon={<Users size={16} />} />
        <Metric label="MRR estimé" value={formatXAF(stats.estimatedMrrXaf)} icon={<Gauge size={16} />} accent />
        <Metric label="File d'attente" value={stats.pendingValidation} icon={<Inbox size={16} />} />
        <Metric label="Proches limite" value={nearLimit} icon={<AlertTriangle size={16} />} />
        <Metric label="Conformité" value={`${conformite}%`} icon={<ShieldCheck size={16} />} demo />
      </div>

      {/* 3 colonnes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PortefeuilleColumn clients={mgr.clients} alerts={mgr.alerts} />
        <FileColumn pending={pending} />
        <EquipeColumn team={team} activity={mgr.activity} />
      </div>

      {/* Revenus par tier + alertes dirigeant */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-slate-200">Revenus par forfait</p>
          <RevenueByTier clientsByTier={mgr.clientsByTier} />
        </div>
        <div className="card">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <AlertTriangle size={15} /> Alertes dirigeant
          </p>
          {mgr.alerts.length === 0 ? (
            <p className="text-sm text-muted">Aucune alerte. Tout est sous contrôle.</p>
          ) : (
            <div className="space-y-2">
              {mgr.alerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                    a.level === "red"
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}
                >
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {a.message}
                </div>
              ))}
            </div>
          )}
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
      <p className={`text-xl font-bold ${accent ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

/* ── Colonne 1 : Portefeuille (Entreprises / Particuliers / Alertes) ── */
function PortefeuilleColumn({
  clients,
  alerts,
}: {
  clients: ManagerClientRow[];
  alerts: { level: "red" | "amber"; message: string }[];
}) {
  const [tab, setTab] = useState<"entreprises" | "particuliers" | "alertes">("entreprises");
  // Type non exposé par /dashboard → dérivé du forfait (démo).
  const entreprises = clients.filter((c) => c.subscriptionTier !== "DECLARANT_SOLO");
  const particuliers = clients.filter((c) => c.subscriptionTier === "DECLARANT_SOLO");

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Portefeuille</p>
        <DemoBadge />
      </div>
      <ColumnTabs
        tabs={[
          { id: "entreprises", label: `Entreprises (${entreprises.length})` },
          { id: "particuliers", label: `Particuliers (${particuliers.length})` },
          { id: "alertes", label: `Alertes (${alerts.length})` },
        ]}
        active={tab}
        onChange={(t) => setTab(t as typeof tab)}
      />
      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
        {tab === "alertes" ? (
          alerts.length === 0 ? (
            <Empty>Aucune alerte client.</Empty>
          ) : (
            alerts.map((a, i) => (
              <div key={i} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                {a.message}
              </div>
            ))
          )
        ) : (tab === "entreprises" ? entreprises : particuliers).length === 0 ? (
          <Empty>Aucun client dans cette catégorie.</Empty>
        ) : (
          (tab === "entreprises" ? entreprises : particuliers).map((c) => (
            <Link
              key={c.id}
              href={`/app/clients/${c.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-100">
                  {tab === "entreprises" ? <Building2 size={13} className="shrink-0 text-muted" /> : <UserIcon size={13} className="shrink-0 text-muted" />}
                  {c.name}
                </p>
                <p className="text-[11px] text-muted">{c.documentCount} docs · maj {c.lastActivity}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <TierBadge tier={c.subscriptionTier} />
                <ConformityBadge ok={c.qboActive} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function ConformityBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <CheckCircle2 size={10} /> Conforme
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
      <AlertTriangle size={10} /> À suivre
    </span>
  );
}

/* ── Colonne 2 : File de validation (Urgents / Normal / Review IA) ── */
function FileColumn({ pending }: { pending: DocumentDTO[] }) {
  const [tab, setTab] = useState<"urgents" | "normal" | "review">("urgents");
  const review = useMemo(() => pending.filter((d) => d.needsReview), [pending]);
  const urgents = useMemo(() => pending.filter((d) => !d.needsReview && (d.ocrConfidence ?? 1) < 0.7), [pending]);
  const normal = useMemo(() => pending.filter((d) => !d.needsReview && (d.ocrConfidence ?? 1) >= 0.7), [pending]);
  const current = tab === "urgents" ? urgents : tab === "normal" ? normal : review;

  return (
    <div className="card">
      <p className="mb-3 text-sm font-semibold text-slate-200">File de validation</p>
      <ColumnTabs
        tabs={[
          { id: "urgents", label: `Urgents (${urgents.length})` },
          { id: "normal", label: `Normal (${normal.length})` },
          { id: "review", label: `Review IA (${review.length})` },
        ]}
        active={tab}
        onChange={(t) => setTab(t as typeof tab)}
      />
      <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
        {current.length === 0 ? (
          <Empty>Aucun document dans cette catégorie.</Empty>
        ) : (
          current.map((d) => (
            <Link
              key={d.id}
              href={`/app/documents/${d.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{d.vendor ?? "Document"}</p>
                <p className="truncate text-[11px] text-muted">
                  {d.client?.name ?? "—"} · {formatXAF(d.amount)}
                </p>
              </div>
              <ConfidenceBadge value={d.ocrConfidence} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Colonne 3 : Équipe (Performance / Permissions / Activité) ── */
function EquipeColumn({
  team,
  activity,
}: {
  team: StaffMember[];
  activity: ManagerData["activity"];
}) {
  const [tab, setTab] = useState<"perf" | "permissions" | "activite">("perf");
  const [editTrainee, setEditTrainee] = useState<{ id: string; name: string } | null>(null);
  // Score de performance non suivi en base → démo déterministe à partir de l'id.
  const perfOf = (id: string) => 78 + (id.charCodeAt(0) % 22);

  return (
    <div className="card">
      <p className="mb-3 text-sm font-semibold text-slate-200">Équipe</p>
      <ColumnTabs
        tabs={[
          { id: "perf", label: "Performance" },
          { id: "permissions", label: "Permissions" },
          { id: "activite", label: "Activité" },
        ]}
        active={tab}
        onChange={(t) => setTab(t as typeof tab)}
      />
      <div className="mt-3 max-h-96 space-y-3 overflow-y-auto">
        {tab === "activite" ? (
          activity.length === 0 ? (
            <Empty>Aucune activité récente.</Empty>
          ) : (
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="text-sm">
                  <p className="text-slate-300">
                    <span className="font-semibold text-slate-100">{a.actorName}</span>{" "}
                    {ACTION_LABELS[a.action] ?? a.action.toLowerCase().replace(/_/g, " ")}
                  </p>
                  {a.detail && <p className="truncate text-xs text-muted">{a.detail}</p>}
                  <p className="flex items-center gap-1 text-[10px] text-muted">
                    <Activity size={10} /> {formatDateTime(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : team.length === 0 ? (
          <Empty>Aucun membre d&apos;équipe.</Empty>
        ) : tab === "perf" ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <DemoBadge />
            </div>
            {team.map((m) => {
              const perf = perfOf(m.id);
              return (
                <div key={m.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-200">{m.name}</span>
                    <span className="text-xs text-muted">{ROLE_LABELS[m.role]} · {perf}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full ${perf >= 90 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${perf}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <DemoBadge />
            </div>
            {team.map((m) => (
              <div key={m.id} className="rounded-lg border border-border bg-bg p-2.5">
                <p className="mb-2 text-sm font-medium text-slate-100">
                  {m.name} <span className="text-xs text-muted">· {ROLE_LABELS[m.role]}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DELEGABLE_CAPS.map((cap) => {
                    const granted = m.role === "MANAGER_N2"; // manager a tout par défaut
                    return (
                      <span
                        key={cap}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          granted ? "bg-emerald-500/15 text-emerald-400" : "border border-border text-muted"
                        }`}
                      >
                        {cap.replace("CAN_", "").replace(/_/g, " ").toLowerCase()}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Stagiaires — permissions configurables (clic → drawer) */}
            <div className="pt-1">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                Stagiaires <DemoBadge />
              </p>
              <div className="space-y-1.5">
                {DEMO_TEAM_TRAINEES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditTrainee(t)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-left hover:bg-surface-2"
                  >
                    <span className="text-sm text-slate-100">{t.name}</span>
                    <span className="text-xs text-primary">Gérer les permissions →</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {editTrainee && <TraineePermissionsDrawer trainee={editTrainee} onClose={() => setEditTrainee(null)} />}
    </div>
  );
}

/* ── Drawer de permissions stagiaire (Manager) ── */
function TraineePermissionsDrawer({ trainee, onClose }: { trainee: { id: string; name: string }; onClose: () => void }) {
  const [perms, setPerms] = useState<TraineePerms>({
    allowedCategories: ["FACTURE_FOURNISSEUR", "NDF", "RECU_CAISSE"],
    canSubmitForApproval: true,
    canViewAllDocuments: true,
    canContactClient: false,
    maxDocumentsPerDay: 20,
  });
  const [busy, setBusy] = useState(false);

  function toggleCat(c: string) {
    setPerms((p) => ({
      ...p,
      allowedCategories: p.allowedCategories.includes(c)
        ? p.allowedCategories.filter((x) => x !== c)
        : [...p.allowedCategories, c],
    }));
  }

  function save() {
    setBusy(true);
    // Démo : PATCH /api/users/:id/permissions inexistant → simulation.
    setTimeout(() => {
      setBusy(false);
      toast.success(`Permissions de ${trainee.name} enregistrées (démo).`);
      onClose();
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Permissions — {trainee.name}</h3>
            <p className="flex items-center gap-1.5 text-xs text-muted">Stagiaire <DemoBadge /></p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <p className="label">Catégories autorisées</p>
        <div className="mb-5 flex flex-wrap gap-2">
          {TRAINEE_CATEGORIES.map((c) => {
            const on = perms.allowedCategories.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted hover:text-slate-200"
                }`}
              >
                {c.replace(/_/g, " ").toLowerCase()}
              </button>
            );
          })}
        </div>

        <div className="mb-5 space-y-2">
          <PermToggle label="Peut soumettre pour approbation" value={perms.canSubmitForApproval} onChange={(v) => setPerms((p) => ({ ...p, canSubmitForApproval: v }))} />
          <PermToggle label="Peut voir tous les documents" value={perms.canViewAllDocuments} onChange={(v) => setPerms((p) => ({ ...p, canViewAllDocuments: v }))} />
          <PermToggle label="Peut contacter les clients" value={perms.canContactClient} onChange={(v) => setPerms((p) => ({ ...p, canContactClient: v }))} />
        </div>

        <div className="mb-6">
          <label className="label">Documents max par jour</label>
          <input
            className="input font-mono w-28"
            type="number"
            min={0}
            value={perms.maxDocumentsPerDay}
            onChange={(e) => setPerms((p) => ({ ...p, maxDocumentsPerDay: Number(e.target.value) }))}
          />
        </div>

        <button onClick={save} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Enregistrer les permissions
        </button>
      </div>
    </div>
  );
}

function PermToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-left text-sm text-slate-200"
    >
      {label}
      <span className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-surface-2"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-[1.15rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/* ── Revenus par forfait (barres) ── */
function RevenueByTier({ clientsByTier }: { clientsByTier: Record<string, number> }) {
  const tiers = (Object.keys(TIER_PRICE) as SubscriptionTier[]).map((t) => ({
    tier: t,
    count: clientsByTier[t] ?? 0,
    revenue: (clientsByTier[t] ?? 0) * TIER_PRICE[t],
  }));
  const max = Math.max(1, ...tiers.map((t) => t.revenue));
  const colors: Record<SubscriptionTier, string> = {
    GRAND_COMPTE: "bg-amber-500",
    COMPTABLE_PRO: "bg-primary",
    DECLARANT_SOLO: "bg-slate-500",
  };
  return (
    <div className="space-y-3">
      {tiers
        .sort((a, b) => b.revenue - a.revenue)
        .map((t) => (
          <div key={t.tier}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-200">
                {TIER_LABELS[t.tier]} <span className="text-xs text-muted">· {t.count} client{t.count > 1 ? "s" : ""}</span>
              </span>
              <span className="font-mono text-sm text-slate-100">{formatXAF(t.revenue)}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
              <div className={`h-full ${colors[t.tier]} transition-all`} style={{ width: `${Math.max(3, (t.revenue / max) * 100)}%` }} />
            </div>
          </div>
        ))}
    </div>
  );
}

/* ───────────────── Employee dashboard — REDESIGN §3 ───────────────── */
const DEMO_MESSAGES = [
  { id: "m1", client: "SARL TechConsult CM", text: "Bonjour, ma facture Orange est-elle bien passée ?", at: "il y a 2 h" },
  { id: "m2", client: "Boutique Awono", text: "Merci pour la validation rapide !", at: "hier" },
  { id: "m3", client: "Grand Compte SA", text: "Pouvez-vous m'envoyer le bilan S1 ?", at: "il y a 3 j" },
];

function EmployeeDashboard({
  stats,
  pending,
  validated,
  clients,
}: {
  stats: StaffStats;
  pending: DocumentDTO[];
  validated: DocumentDTO[];
  clients: ClientRow[];
}) {
  const traineeTasks = pending.filter((d) => d.needsReview).length; // proxy démo

  return (
    <div className="space-y-6">
      {/* Métriques */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="File d'attente" value={stats.pendingValidation} icon={<Inbox size={16} />} accent />
        <Metric label="Validés" value={validated.length || stats.pushedToQbo} icon={<CheckCircle2 size={16} />} />
        <Metric label="Clients" value={clients.length} icon={<Users size={16} />} />
        <Metric label="Tâches stagiaires" value={traineeTasks} icon={<Target size={16} />} demo />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gauche — file de validation */}
        <EmployeeFileColumn pending={pending} validated={validated} />

        {/* Droite — dossiers + messages + objectifs */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Mes dossiers clients</p>
              <Link href="/app/clients" className="text-xs text-primary hover:underline">
                Tout voir →
              </Link>
            </div>
            {clients.length === 0 ? (
              <Empty>Aucun dossier client.</Empty>
            ) : (
              <div className="space-y-2">
                {clients.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/app/clients/${c.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2 hover:bg-surface-2"
                  >
                    <span className="flex items-center gap-1.5 truncate text-sm text-slate-100">
                      {c.type === "COMPANY" ? <Building2 size={13} className="text-muted" /> : <UserIcon size={13} className="text-muted" />}
                      {c.name}
                    </span>
                    <TierBadge tier={c.subscriptionTier} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <MessageSquare size={15} /> Messages clients
              </p>
              <DemoBadge />
            </div>
            <ul className="space-y-2">
              {DEMO_MESSAGES.map((m) => (
                <li key={m.id} className="rounded-lg border border-border bg-bg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-100">{m.client}</span>
                    <span className="text-[10px] text-muted">{m.at}</span>
                  </div>
                  <p className="truncate text-xs text-muted">{m.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/app/my-objectives" className="card flex items-center justify-between hover:bg-surface-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Target size={15} /> Mes objectifs
            </span>
            <span className="text-xs text-primary">Ouvrir →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmployeeFileColumn({ pending, validated }: { pending: DocumentDTO[]; validated: DocumentDTO[] }) {
  const [tab, setTab] = useState<"avalider" | "stagiaires" | "valides">("avalider");
  const stagiaires = useMemo(() => pending.filter((d) => d.needsReview), [pending]); // proxy démo
  const current = tab === "avalider" ? pending : tab === "stagiaires" ? stagiaires : validated;

  return (
    <div className="card">
      <p className="mb-3 text-sm font-semibold text-slate-200">Ma file de validation</p>
      <ColumnTabs
        tabs={[
          { id: "avalider", label: `À valider (${pending.length})` },
          { id: "stagiaires", label: `Stagiaires (${stagiaires.length})` },
          { id: "valides", label: `Validés (${validated.length})` },
        ]}
        active={tab}
        onChange={(t) => setTab(t as typeof tab)}
      />
      {tab === "stagiaires" && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <DemoBadge /> brouillons stagiaires approximés par les documents à revoir
        </p>
      )}
      <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
        {current.length === 0 ? (
          <Empty>Aucun document dans cette catégorie.</Empty>
        ) : (
          current.map((d) => (
            <Link
              key={d.id}
              href={`/app/documents/${d.id}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{d.vendor ?? "Document"}</p>
                <p className="truncate text-[11px] text-muted">
                  {d.client?.name ?? "—"} · {formatXAF(d.amount)}
                </p>
              </div>
              <ConfidenceBadge value={d.ocrConfidence} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

/* ───────────────── Trainee dashboard — REDESIGN §4 ───────────────── */
const TRAINEE_CAN = [
  "Corriger les champs OCR",
  "Proposer une catégorie",
  "Soumettre un brouillon",
  "Effectuer un rapprochement bancaire",
];
const TRAINEE_CANNOT = [
  "Approuver → QuickBooks",
  "Modifier un compte SYSCOHADA validé",
  "Contacter un client",
  "Rejeter un document",
];
const DEMO_DRAFTS: { id: string; vendor: string; client: string }[] = [
  { id: "d1", vendor: "Total Énergies", client: "SARL TechConsult CM" },
  { id: "d2", vendor: "Eneo", client: "Boutique Awono" },
  { id: "d3", vendor: "Camtel", client: "Grand Compte SA" },
];
const DEMO_CORRECTED: { id: string; vendor: string; note: string }[] = [
  { id: "c1", vendor: "Orange CM", note: "Compte corrigé en 626 par M.-L. Owono" },
  { id: "c2", vendor: "Express Union", note: "Montant ajusté avant validation" },
];

// Catégories documentaires (9) + permissions stagiaire (démo).
const DOC_CATEGORIES: { value: string; label: string }[] = [
  { value: "FACTURE_FOURNISSEUR", label: "Facture fournisseur" },
  { value: "FACTURE_CLIENT", label: "Facture client" },
  { value: "NDF", label: "Note de frais" },
  { value: "RELEVE_BANCAIRE", label: "Relevé bancaire" },
  { value: "BULLETIN_PAIE", label: "Bulletin de paie" },
  { value: "DECLARATION_FISCALE", label: "Déclaration fiscale" },
  { value: "CONTRAT", label: "Contrat" },
  { value: "RECU_CAISSE", label: "Reçu de caisse" },
  { value: "JUSTIFICATIF_DOUANE", label: "Justificatif de douane" },
];
// Catégories autorisées du stagiaire — démo (viendrait de users/me → permissions.allowedCategories).
const TRAINEE_ALLOWED = new Set(["FACTURE_FOURNISSEUR", "NDF", "RECU_CAISSE"]);
function pseudoCategory(id: string) {
  return DOC_CATEGORIES[id.charCodeAt(0) % DOC_CATEGORIES.length];
}

function TraineeDashboard({ stats, pending }: { stats: StaffStats; pending: DocumentDTO[] }) {
  const [tab, setTab] = useState<"today" | "all" | "drafts" | "corrected">("today");
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* En-tête actions stagiaire */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button onClick={() => setContactOpen(true)} className="btn-ghost">
          <MessageSquare size={16} /> Contacter mon N+1
        </button>
      </div>

      {/* Métriques */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Tâches aujourd'hui" value={pending.length} icon={<Target size={16} />} accent />
        <Metric label="Brouillons" value={DEMO_DRAFTS.length} icon={<FileText size={16} />} demo />
        <Metric label="Validés / mois" value={stats.pushedToQbo} icon={<CheckCircle2 size={16} />} />
        <Metric label="Précision" value="91%" icon={<Gauge size={16} />} demo />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gauche — tâches assignées */}
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-slate-200">Mes tâches assignées</p>
          <ColumnTabs
            tabs={[
              { id: "today", label: `Aujourd'hui (${pending.length})` },
              { id: "all", label: `Tous les documents (${pending.length})` },
              { id: "drafts", label: `Mes brouillons (${DEMO_DRAFTS.length})` },
              { id: "corrected", label: `Corrigés (${DEMO_CORRECTED.length})` },
            ]}
            active={tab}
            onChange={(t) => setTab(t as typeof tab)}
          />
          {(tab === "all" || tab === "drafts" || tab === "corrected") && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
              <DemoBadge /> {tab === "all" ? "catégories & permissions simulées (users/me)" : "données simulées (brouillons non stockés)"}
            </p>
          )}
          <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto">
            {tab === "today" ? (
              pending.length === 0 ? (
                <Empty>Aucune tâche assignée aujourd&apos;hui.</Empty>
              ) : (
                pending.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">{d.vendor ?? "Document"}</p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                        {d.client?.name ?? "—"}
                      </span>
                    </div>
                    <Link href={`/app/documents/${d.id}`} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
                      Traiter
                    </Link>
                  </div>
                ))
              )
            ) : tab === "all" ? (
              pending.length === 0 ? (
                <Empty>Aucun document entrant.</Empty>
              ) : (
                pending.map((d) => {
                  const cat = pseudoCategory(d.id);
                  const allowed = TRAINEE_ALLOWED.has(cat.value);
                  return (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">{d.vendor ?? "Document"}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{cat.label}</span>
                      </div>
                      {allowed ? (
                        <Link href={`/app/documents/${d.id}`} className="btn-ghost shrink-0 px-3 py-1.5 text-xs">
                          Traiter
                        </Link>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[10px] font-medium text-muted">
                          <Lock size={11} /> Accès restreint
                        </span>
                      )}
                    </div>
                  );
                })
              )
            ) : tab === "drafts" ? (
              DEMO_DRAFTS.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{d.vendor}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{d.client}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">En attente N+1</span>
                </div>
              ))
            ) : (
              DEMO_CORRECTED.map((c) => (
                <div key={c.id} className="rounded-lg border border-border bg-bg px-3 py-2">
                  <p className="text-sm font-medium text-slate-100">{c.vendor}</p>
                  <p className="text-[11px] text-muted">{c.note}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Droite — limites de rôle + objectifs + progression */}
        <div className="space-y-4">
          <div className="card">
            <p className="mb-3 text-sm font-semibold text-slate-200">Mes limites de rôle</p>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-300">
                <CheckCircle2 size={13} /> Ce que je peux faire
              </p>
              <ul className="space-y-1.5">
                {TRAINEE_CAN.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle2 size={14} className="shrink-0 text-blue-400" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-300">
                <X size={13} /> Nécessite un collaborateur
              </p>
              <ul className="space-y-1.5">
                {TRAINEE_CANNOT.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-slate-400">
                    <X size={14} className="shrink-0 text-red-400" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mes objectifs → page dédiée */}
          <Link href="/app/my-objectives" className="card flex items-center justify-between hover:bg-surface-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Target size={15} /> Mes objectifs
            </span>
            <span className="text-xs text-primary">Ouvrir →</span>
          </Link>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">Ma progression</p>
              <DemoBadge />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Metric label="Précision" value="91%" icon={<Gauge size={16} />} />
              <Metric label="Corrections" value={12} icon={<Pencil size={16} />} />
              <Metric label="Vitesse moy." value="3,2 min" icon={<Activity size={16} />} />
            </div>
          </div>
        </div>
      </div>

      {contactOpen && <N1ContactModal onClose={() => setContactOpen(false)} />}
    </div>
  );
}

/* ── Messagerie simple avec le N+1 (démo) ── */
function N1ContactModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ from: "moi" | "n1"; text: string }[]>([
    { from: "n1", text: "Bonjour Yann, n'hésite pas si tu as une question sur un document." },
    { from: "moi", text: "Merci ! Je vous signale si un compte SYSCOHADA est incertain." },
  ]);
  const [text, setText] = useState("");

  function send() {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { from: "moi", text: text.trim() }]);
    setText("");
    toast.success("Message envoyé à votre N+1 (démo).");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex h-[28rem] w-full max-w-md flex-col rounded-xl border border-border bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <MessageSquare size={16} /> Mon N+1 — Marie-Louise Owono <DemoBadge />
          </p>
          <button onClick={onClose} aria-label="Fermer" className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "moi" ? "justify-end" : "justify-start"}`}>
              <span className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.from === "moi" ? "bg-primary text-white" : "bg-surface-2 text-slate-200"}`}>
                {m.text}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <input
            className="input flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Écrire un message…"
          />
          <button onClick={send} aria-label="Envoyer" className="btn-primary shrink-0">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── helpers ── */
function ColumnTabs({
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

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-1 py-6 text-center text-sm text-muted">{children}</p>;
}
