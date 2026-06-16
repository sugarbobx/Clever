"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UserCog, Plus, HeartHandshake, UserCheck, GraduationCap, X, Circle, ChevronRight, CheckCircle2, XCircle, Crosshair, Loader2, Check, type LucideIcon } from "lucide-react";
import { useAuth } from "@/stores/auth.store";
import { DemoBadge } from "@/components/ui/Misc";

interface Member { name: string; online: boolean; perf: number; dossiers: number; charge: number }
interface Group {
  id: string;
  role: string;
  count: number;
  focus: string;
  color: string;
  icon: LucideIcon;
  members: Member[];
  scope: string;
  permissions: string[];
  restrictions: string[];
}

const TEAM: Group[] = [
  {
    id: "manager",
    role: "Managers (N+2)",
    count: 2,
    focus: "Stratégie fiscale, validation finale, tarification",
    color: "text-amber-400",
    icon: UserCog,
    members: [
      { name: "Awa Ndiaye", online: true, perf: 98, dossiers: 18, charge: 82 },
      { name: "Paul Etoga", online: false, perf: 93, dossiers: 14, charge: 67 },
    ],
    scope: "Accès total — tous les clients et toutes les actions",
    permissions: ["Validation finale & push QuickBooks", "Tarification & forfaits clients", "Création et assignation d'objectifs", "Gestion des permissions de l'équipe", "Journal d'audit complet"],
    restrictions: [],
  },
  {
    id: "hr",
    role: "Ressources Humaines",
    count: 1,
    focus: "Paie, suivi du temps, notes de frais",
    color: "text-primary",
    icon: HeartHandshake,
    members: [{ name: "Paul Mbarga", online: true, perf: 96, dossiers: 9, charge: 61 }],
    scope: "Paie, RH et évaluation — périmètre transverse",
    permissions: ["Paie & cotisations CNPS", "Notes de frais", "Évaluation des stagiaires", "Suivi du temps"],
    restrictions: ["Validation comptable des documents", "Push vers QuickBooks"],
  },
  {
    id: "employee",
    role: "Collaborateurs",
    count: 3,
    focus: "Gestion des dossiers clients, rapprochements",
    color: "text-emerald-400",
    icon: UserCheck,
    members: [
      { name: "Sandrine Kana", online: true, perf: 99, dossiers: 16, charge: 88 },
      { name: "Marie-Louise Owono", online: true, perf: 95, dossiers: 12, charge: 74 },
      { name: "Jean Talla", online: false, perf: 89, dossiers: 7, charge: 48 },
    ],
    scope: "Dossiers clients assignés",
    permissions: ["Validation des documents", "Push vers QuickBooks", "Rapprochements bancaires", "Messagerie client", "Assignation de tâches aux stagiaires (si délégué)"],
    restrictions: ["Tarification & forfaits", "Gestion des permissions", "Audit complet du cabinet"],
  },
  {
    id: "trainee",
    role: "Stagiaires",
    count: 1,
    focus: "Atelier OCR (brouillon), saisie répétitive",
    color: "text-slate-300",
    icon: GraduationCap,
    members: [{ name: "Yann Foko", online: true, perf: 90, dossiers: 5, charge: 52 }],
    scope: "Documents en brouillon — tâches assignées",
    permissions: ["Correction des champs OCR", "Proposition de catégorie", "Soumission d'un brouillon", "Rapprochement bancaire assisté"],
    restrictions: ["Approbation → QuickBooks", "Modification d'un compte SYSCOHADA validé", "Contact direct client", "Rejet d'un document"],
  },
];

export default function TeamPage() {
  const [selected, setSelected] = useState<Group | null>(null);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Équipe</h1>
          <p className="text-sm text-muted">Composition et capacités du cabinet.</p>
        </div>
        <button disabled title="Bientôt disponible" className="btn-ghost cursor-not-allowed opacity-50">
          <Plus size={16} /> Inviter un membre
          <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">bientôt</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TEAM.map((t) => (
          <button key={t.id} onClick={() => setSelected(t)} className="card text-left transition-colors hover:bg-surface-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 font-semibold text-slate-100">
                <t.icon size={18} className={t.color} /> {t.role}
              </p>
              <span className="text-2xl font-bold text-white">{t.count}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{t.focus}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
              Voir le détail <ChevronRight size={13} />
            </p>
          </button>
        ))}
      </div>

      {selected && <TeamDrawer key={selected.id} group={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

interface Capability { label: string; granted: boolean }

function TeamDrawer({ group, onClose }: { group: Group; onClose: () => void }) {
  const { user } = useAuth();
  const canEdit = user?.role === "MANAGER_N2"; // seul le manager modifie les permissions
  const Icon = group.icon;
  const active = group.members.filter((m) => m.online).length;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caps, setCaps] = useState<Capability[]>(() => [
    ...group.permissions.map((label) => ({ label, granted: true })),
    ...group.restrictions.map((label) => ({ label, granted: false })),
  ]);

  const granted = caps.filter((c) => c.granted);
  const notGranted = caps.filter((c) => !c.granted);

  function toggleCap(label: string) {
    setCaps((prev) => prev.map((c) => (c.label === label ? { ...c, granted: !c.granted } : c)));
  }
  function save() {
    setSaving(true);
    // Démo : PATCH /api/users/:id/permissions inexistant → simulation.
    setTimeout(() => {
      setSaving(false);
      setEditing(false);
      toast.success(`Permissions de « ${group.role} » mises à jour (démo).`);
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside
        className="flex h-screen w-[480px] max-w-full flex-col overflow-y-auto border-l border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Croix de fermeture */}
        <div className="flex items-center justify-end px-5 pt-4">
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* SECTION 1 — En-tête du groupe */}
        <div className="px-6 pb-6">
          <div className="flex items-start gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 ${group.color}`}>
              <Icon size={24} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">{group.role}</h2>
              <p className="mt-0.5 text-sm text-muted">{group.focus}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <Circle size={7} className="fill-emerald-400" /> {active} membre{active > 1 ? "s" : ""} actif{active > 1 ? "s" : ""}
                <span className="text-muted">· {group.count} au total</span>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* SECTION 2 — Membres (inféré, à préciser) */}
        <div className="px-6 py-6">
          <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
            Membres <DemoBadge />
          </p>
          <div className="space-y-2.5">
            {group.members.map((m) => (
              <div key={m.name} className="rounded-lg border border-border bg-bg px-3 py-2.5">
                {/* Nom + statut */}
                <div className="mb-2.5 flex items-center gap-3">
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-slate-200">
                    {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${m.online ? "bg-emerald-400" : "bg-slate-500"}`} />
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-100">{m.name}</span>
                  <span className="text-[11px] text-muted">{m.online ? "En ligne" : "Hors ligne"}</span>
                </div>
                {/* Perf · Dossiers · Charge */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-surface-2 px-2 py-1.5 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-muted">Perf</p>
                    <p className={`text-sm font-bold ${m.perf >= 95 ? "text-emerald-400" : "text-slate-100"}`}>{m.perf}%</p>
                  </div>
                  <div className="rounded-md bg-surface-2 px-2 py-1.5 text-center">
                    <p className="text-[9px] uppercase tracking-wide text-muted">Dossiers</p>
                    <p className="text-sm font-bold text-slate-100">{m.dossiers}</p>
                  </div>
                  <div className="rounded-md bg-surface-2 px-2 py-1.5">
                    <p className="text-center text-[9px] uppercase tracking-wide text-muted">Charge</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg">
                        <div className={`h-full ${m.charge >= 80 ? "bg-red-500" : m.charge >= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${m.charge}%` }} />
                      </div>
                      <span className="text-[10px] text-muted">{m.charge}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* SECTION 3 — Permissions & périmètre d'action */}
        <div className="px-6 py-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
              Permissions &amp; périmètre <DemoBadge />
            </p>
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="text-xs font-semibold text-primary hover:underline">
                Modifier
              </button>
            )}
          </div>

          {/* Périmètre d'action */}
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-bg px-3 py-2.5">
            <Crosshair size={15} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Périmètre d&apos;action</p>
              <p className="text-sm text-slate-200">{group.scope}</p>
            </div>
          </div>

          {editing ? (
            /* ── Mode édition (manager) : toggle chaque capacité ── */
            <div>
              <p className="mb-2 text-[11px] text-muted">Activez ou désactivez chaque permission pour ce groupe.</p>
              <div className="space-y-1.5">
                {caps.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => toggleCap(c.label)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left text-sm"
                  >
                    <span className={c.granted ? "text-slate-200" : "text-slate-400"}>{c.label}</span>
                    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${c.granted ? "bg-emerald-500" : "bg-surface-2"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${c.granted ? "left-[1.15rem]" : "left-0.5"}`} />
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEditing(false)} disabled={saving} className="btn-ghost !py-1.5 text-xs">
                  Annuler
                </button>
                <button onClick={save} disabled={saving} className="btn-primary !py-1.5 text-xs">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer
                </button>
              </div>
            </div>
          ) : (
            /* ── Lecture seule ── */
            <>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">Permissions accordées</p>
              <ul className="space-y-1.5">
                {granted.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm text-slate-200">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" /> {c.label}
                  </li>
                ))}
                {granted.length === 0 && <li className="text-sm text-muted">Aucune permission accordée.</li>}
              </ul>

              {notGranted.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-red-400">Hors périmètre — nécessite une escalade</p>
                  <ul className="space-y-1.5">
                    {notGranted.map((c) => (
                      <li key={c.label} className="flex items-center gap-2 text-sm text-slate-400">
                        <XCircle size={14} className="shrink-0 text-red-400" /> {c.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
