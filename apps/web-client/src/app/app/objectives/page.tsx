"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Target, Plus, Trash2, Flag, Check, AlertTriangle, Users, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import { DemoBadge } from "@/components/ui/Misc";
import { formatDate } from "@/lib/format";

type Frequence = "JOURNALIER" | "HEBDOMADAIRE" | "MENSUEL" | "ANNUEL";
type Priorite = "HAUTE" | "MOYENNE" | "BASSE";
type ObjStatus = "EN_COURS" | "BLOQUE" | "EN_RETARD" | "COMPLETE";

interface SubObjective {
  id: string;
  title: string;
  assignedToId: string;
  done: boolean;
}
interface Objective {
  id: string;
  title: string;
  description?: string;
  frequence: Frequence;
  priorite: Priorite;
  assignedToId: string;
  assignedToName: string;
  clientId?: string;
  clientName?: string;
  echeance: string;
  status: ObjStatus;
  subObjectives: SubObjective[];
}
interface StaffMember { id: string; name: string; role: string }
interface ClientRow { id: string; name: string }

const FREQ_META: Record<Frequence, { label: string; bar: string; chip: string; text: string }> = {
  JOURNALIER: { label: "Journalier", bar: "bg-red-500", chip: "bg-red-500/15 text-red-400", text: "text-red-400" },
  HEBDOMADAIRE: { label: "Hebdomadaire", bar: "bg-amber-500", chip: "bg-amber-500/15 text-amber-400", text: "text-amber-400" },
  MENSUEL: { label: "Mensuel", bar: "bg-blue-500", chip: "bg-blue-500/15 text-blue-400", text: "text-blue-400" },
  ANNUEL: { label: "Annuel", bar: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-400", text: "text-emerald-400" },
};
const PRIO_META: Record<Priorite, string> = {
  HAUTE: "bg-red-500/15 text-red-400",
  MOYENNE: "bg-amber-500/15 text-amber-400",
  BASSE: "bg-slate-500/15 text-slate-300",
};

// Démo : modèle Objective absent de web-client → état local + pas de POST réel.
const SEED: Objective[] = [
  {
    id: "o1",
    title: "Valider la file urgente du jour",
    frequence: "JOURNALIER",
    priorite: "HAUTE",
    assignedToId: "",
    assignedToName: "Marie-Louise Owono",
    clientName: "SARL TechConsult CM",
    echeance: "2026-06-15",
    status: "EN_COURS",
    subObjectives: [
      { id: "s1", title: "Traiter les reçus < 0,70 confiance", assignedToId: "", done: true },
      { id: "s2", title: "Pousser vers QuickBooks", assignedToId: "", done: false },
    ],
  },
  {
    id: "o2",
    title: "Rapprochement bancaire",
    frequence: "HEBDOMADAIRE",
    priorite: "MOYENNE",
    assignedToId: "",
    assignedToName: "Ange Ndoumbe",
    clientName: "Boutique Awono",
    echeance: "2026-06-19",
    status: "BLOQUE",
    subObjectives: [{ id: "s3", title: "Importer le relevé", assignedToId: "", done: false }],
  },
  {
    id: "o3",
    title: "Déclaration TVA mensuelle",
    frequence: "MENSUEL",
    priorite: "HAUTE",
    assignedToId: "",
    assignedToName: "Marie-Louise Owono",
    clientName: "Portefeuille entreprises",
    echeance: "2026-06-15",
    status: "EN_RETARD",
    subObjectives: [
      { id: "s4", title: "Collecter les factures", assignedToId: "", done: true },
      { id: "s5", title: "Déposer la déclaration", assignedToId: "", done: false },
    ],
  },
];

type Tab = "overview" | "create" | "team";

export default function ObjectivesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [objectives, setObjectives] = useState<Objective[]>(SEED);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);

  useEffect(() => {
    if (!loading && user && user.role !== "MANAGER_N2") {
      toast.error("Vous n'avez pas accès à cette section.");
      router.replace("/app/dashboard");
    }
  }, [user, loading, router]);

  const loadRefs = useCallback(async () => {
    const [s, c] = await Promise.all([
      api.get<{ staff: StaffMember[] }>("/staff"),
      api.get<{ clients: ClientRow[] }>("/clients"),
    ]);
    if (s.data?.staff) setStaff(s.data.staff);
    if (c.data?.clients) setClients(c.data.clients);
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Target size={22} /> Objectifs <DemoBadge />
          </h1>
          <p className="text-sm text-muted">Créez, assignez et suivez les objectifs de l&apos;équipe.</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-border pb-3">
        {(
          [
            { id: "overview", label: "Vue d'ensemble" },
            { id: "create", label: "Créer / Modifier" },
            { id: "team", label: "Suivi équipe" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-primary text-white" : "border border-border text-muted hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab objectives={objectives} />}
      {tab === "create" && (
        <CreateTab
          staff={staff}
          clients={clients}
          onCreate={(obj) => {
            setObjectives((prev) => [obj, ...prev]);
            setTab("overview");
            toast.success("Objectif créé et assigné (démo).");
          }}
        />
      )}
      {tab === "team" && <TeamTab objectives={objectives} staff={staff} />}
    </div>
  );
}

function progressOf(o: Objective) {
  if (o.subObjectives.length === 0) return 0;
  return Math.round((o.subObjectives.filter((s) => s.done).length / o.subObjectives.length) * 100);
}

/* ── Vue d'ensemble ── */
function OverviewTab({ objectives }: { objectives: Objective[] }) {
  const counts = (Object.keys(FREQ_META) as Frequence[]).map((f) => ({
    freq: f,
    n: objectives.filter((o) => o.frequence === f).length,
  }));
  const blocked = objectives.filter((o) => o.status === "BLOQUE" || o.status === "EN_RETARD");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((c) => (
          <div key={c.freq} className="rounded-lg border border-border bg-surface p-3">
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${FREQ_META[c.freq].text}`}>{FREQ_META[c.freq].label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{c.n}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-slate-200">Objectifs actifs</p>
          <div className="space-y-2">
            {objectives.map((o) => {
              const pct = progressOf(o);
              return (
                <div key={o.id} className="rounded-lg border border-border bg-bg p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-100">{o.title}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIO_META[o.priorite]}`}>
                      {o.priorite.toLowerCase()}
                    </span>
                  </div>
                  <p className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                    <span className={`rounded-full px-1.5 py-0.5 ${FREQ_META[o.frequence].chip}`}>{FREQ_META[o.frequence].label}</span>
                    <span>{o.assignedToName}</span>
                    {o.clientName && <span>· {o.clientName}</span>}
                    <span>· échéance {formatDate(o.echeance)}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs text-muted">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
            <AlertTriangle size={15} /> Alertes
          </p>
          {blocked.length === 0 ? (
            <p className="text-sm text-muted">Aucun objectif bloqué ou en retard.</p>
          ) : (
            <div className="space-y-2">
              {blocked.map((o) => (
                <div
                  key={o.id}
                  className={`rounded-lg border px-3 py-2 ${
                    o.status === "EN_RETARD" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-100">{o.title}</p>
                  <p className={`text-xs ${o.status === "EN_RETARD" ? "text-red-300" : "text-amber-300"}`}>
                    {o.status === "EN_RETARD" ? "En retard" : "Bloqué"} · {o.assignedToName}
                  </p>
                  <button onClick={() => toast.success("Objectif réassigné (démo).")} className="mt-1 text-xs font-semibold text-primary hover:underline">
                    Réassigner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Créer / Modifier ── */
function CreateTab({
  staff,
  clients,
  onCreate,
}: {
  staff: StaffMember[];
  clients: ClientRow[];
  onCreate: (o: Objective) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequence, setFrequence] = useState<Frequence>("JOURNALIER");
  const [priorite, setPriorite] = useState<Priorite>("MOYENNE");
  const [assignedToId, setAssignedToId] = useState("");
  const [clientId, setClientId] = useState("");
  const [echeance, setEcheance] = useState("");
  const [subs, setSubs] = useState<{ id: string; title: string; assignedToId: string }[]>([]);
  const [subTitle, setSubTitle] = useState("");
  const [subAssignee, setSubAssignee] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = title.trim().length >= 3 && assignedToId && echeance;

  function addSub() {
    if (!subTitle.trim()) return;
    setSubs((prev) => [...prev, { id: `tmp${Date.now()}`, title: subTitle.trim(), assignedToId: subAssignee }]);
    setSubTitle("");
    setSubAssignee("");
  }

  function submit() {
    if (!valid) return toast.error("Titre, responsable et échéance sont requis.");
    setBusy(true);
    // Démo : pas de POST /api/objectives (modèle absent). On crée localement.
    const assignedToName = staff.find((s) => s.id === assignedToId)?.name ?? "—";
    const clientName = clients.find((c) => c.id === clientId)?.name;
    const obj: Objective = {
      id: `o${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      frequence,
      priorite,
      assignedToId,
      assignedToName,
      clientId: clientId || undefined,
      clientName,
      echeance,
      status: "EN_COURS",
      subObjectives: subs.map((s) => ({ id: s.id, title: s.title, assignedToId: s.assignedToId, done: false })),
    };
    setBusy(false);
    onCreate(obj);
  }

  const nameFor = (id: string) => staff.find((s) => s.id === id)?.name ?? "Non assigné";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Form */}
      <div className="card space-y-4">
        <div>
          <label className="label">Titre</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Valider la file du jour" />
        </div>
        <div>
          <label className="label">Description (optionnel)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Fréquence</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FREQ_META) as Frequence[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFrequence(f)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  frequence === f ? "border-primary bg-primary/15 text-primary" : "border-border text-muted hover:text-slate-200"
                }`}
              >
                {FREQ_META[f].label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Assigner à</label>
            <select className="input" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">— Choisir —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Client concerné</label>
            <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">— Aucun —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Échéance</label>
            <input className="input" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
          </div>
          <div>
            <label className="label">Priorité</label>
            <div className="flex gap-2">
              {(Object.keys(PRIO_META) as Priorite[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorite(p)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium ${
                    priorite === p ? "border-primary bg-primary/15 text-primary" : "border-border text-slate-300"
                  }`}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-objectives + preview */}
      <div className="card space-y-4">
        <div>
          <label className="label">Sous-objectifs</label>
          <div className="space-y-2">
            {subs.length === 0 && <p className="text-sm text-muted">Aucun sous-objectif pour l&apos;instant.</p>}
            {subs.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-100">{s.title}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted">
                    <Flag size={10} /> {nameFor(s.assignedToId)}
                  </p>
                </div>
                <button onClick={() => setSubs((prev) => prev.filter((x) => x.id !== s.id))} className="shrink-0 text-muted hover:text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="input flex-1" value={subTitle} onChange={(e) => setSubTitle(e.target.value)} placeholder="Nouveau sous-objectif" />
            <select className="input w-40" value={subAssignee} onChange={(e) => setSubAssignee(e.target.value)}>
              <option value="">Assigner…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button onClick={addSub} className="btn-ghost shrink-0">
              <Plus size={15} /> Ajouter
            </button>
          </div>
        </div>

        {/* Aperçu dynamique */}
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Aperçu</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FREQ_META[frequence].chip}`}>{FREQ_META[frequence].label}</span>
          </div>
          <p className="text-sm font-medium text-slate-100">{title || "Titre de l'objectif"}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className={`rounded-full px-1.5 py-0.5 ${PRIO_META[priorite]}`}>{priorite.toLowerCase()}</span>
            <span>{nameFor(assignedToId)}</span>
            {clientId && <span>· {clients.find((c) => c.id === clientId)?.name}</span>}
            <span>· {subs.length} sous-objectif{subs.length > 1 ? "s" : ""}</span>
          </p>
        </div>

        <button onClick={submit} disabled={!valid || busy} className="btn-primary w-full">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Créer et assigner
        </button>
      </div>
    </div>
  );
}

/* ── Suivi équipe ── */
function TeamTab({ objectives, staff }: { objectives: Objective[]; staff: StaffMember[] }) {
  const metrics = useMemo(
    () => ({
      crees: objectives.length,
      completes: objectives.filter((o) => progressOf(o) === 100).length,
      enCours: objectives.filter((o) => o.status === "EN_COURS" && progressOf(o) < 100).length,
      enRetard: objectives.filter((o) => o.status === "EN_RETARD" || o.status === "BLOQUE").length,
    }),
    [objectives]
  );

  const perMember = staff.map((m) => {
    const mine = objectives.filter((o) => o.assignedToName === m.name);
    const avg = mine.length ? Math.round(mine.reduce((s, o) => s + progressOf(o), 0) / mine.length) : 0;
    return { ...m, count: mine.length, avg };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <TeamMetric label="Créés" value={metrics.crees} />
        <TeamMetric label="Complétés" value={metrics.completes} accent />
        <TeamMetric label="En cours" value={metrics.enCours} />
        <TeamMetric label="En retard" value={metrics.enRetard} danger />
      </div>

      <div className="card">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Users size={15} /> Performance par membre
        </p>
        {perMember.length === 0 ? (
          <p className="text-sm text-muted">Aucun membre d&apos;équipe.</p>
        ) : (
          <div className="space-y-3">
            {perMember.map((m) => (
              <div key={m.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-200">{m.name}</span>
                  <span className="text-xs text-muted">{m.count} objectif{m.count > 1 ? "s" : ""} · {m.avg}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className={`h-full ${m.avg >= 80 ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${m.avg}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamMetric({ label, value, accent, danger }: { label: string; value: number; accent?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${danger ? "text-red-400" : accent ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
