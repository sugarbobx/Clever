"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MessageCircle,
  PartyPopper,
  Building2,
  User as UserIcon,
  Landmark,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import { TIER_LABELS } from "@/components/subscription/Tier";
import { DemoBadge } from "@/components/ui/Misc";
import type { SubscriptionTier } from "@/lib/types";

type ClientType = "INDIVIDUAL" | "COMPANY";
interface StaffMember { id: string; name: string; role: string }

const TIERS: SubscriptionTier[] = ["DECLARANT_SOLO", "COMPTABLE_PRO", "GRAND_COMPTE"];
const COUNTRIES = [
  { code: "CM", label: "Cameroun (TVA 19,25 %)" },
  { code: "CI", label: "Côte d'Ivoire (TVA 18 %)" },
  { code: "SN", label: "Sénégal (TVA 18 %)" },
  { code: "GA", label: "Gabon (TVA 18 %)" },
];
const STEPS = ["Profil", "Situation", "Objectifs", "Récapitulatif"];
// REDESIGN §8 — non persistés par l'API actuelle (démo).
const REVENUE_SOURCES = ["Salaire", "Freelance", "Revenus fonciers", "Commerce", "Dividendes", "Autre"];
const CLIENT_GOALS = [
  "Conformité fiscale",
  "Suivi comptable",
  "Achat immobilier",
  "Activité indépendante",
  "Épargne & patrimoine",
  "Contrôle fiscal",
];

export default function NewClientWizard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // MANAGER-only guard (the API enforces this too).
  useEffect(() => {
    if (!loading && user && user.role !== "MANAGER_N2") {
      toast.error("Vous n'avez pas accès à cette section.");
      router.replace("/app/clients");
    }
  }, [user, loading, router]);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+237");
  const [type, setType] = useState<ClientType>("COMPANY");
  const [tier, setTier] = useState<SubscriptionTier>("COMPTABLE_PRO");
  const [country, setCountry] = useState("CM");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assignedStaffId, setAssignedStaffId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  // Champs REDESIGN §8 (démo, non envoyés à l'API).
  const [niu, setNiu] = useState("");
  const [niuRequested, setNiuRequested] = useState(false);
  const [niuModal, setNiuModal] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  useEffect(() => {
    api.get<{ staff: StaffMember[] }>("/staff").then(({ data }) => {
      if (data?.staff) setStaff(data.staff);
    });
  }, []);

  const step1Valid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email);
  const assignedName = staff.find((s) => s.id === assignedStaffId)?.name ?? "Non assigné";

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  function next() {
    if (step === 1 && !step1Valid) return toast.error("Renseignez au moins le nom et un email valide.");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function create() {
    setBusy(true);
    // Seuls les champs réellement persistés sont envoyés (NIU / sources / objectifs = démo).
    const { data, error } = await api.post<{ client: { id: string; name: string } }>("/clients", {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      type,
      country,
      subscriptionTier: tier,
      assignedStaffId: assignedStaffId || undefined,
    });
    setBusy(false);
    if (error) return toast.error(error);
    setCreated(data!.client);
    toast.success("Client créé.");
  }

  // ── Success screen: welcome WhatsApp message ──
  if (created) {
    const limitLine = tier === "DECLARANT_SOLO" ? "30 documents/mois" : "documents illimités";
    const welcome = `Bonjour ${created.name} ! 👋

Votre espace CLEVER est prêt. Vous êtes suivi(e) par ${assignedName}.

Pour soumettre vos documents, envoyez simplement une photo de vos reçus et factures à ce numéro WhatsApp.

CLEVER analysera vos documents automatiquement et votre comptable les validera sous 24h.

Forfait : ${TIER_LABELS[tier]} — ${limitLine}

Bienvenue chez THECLEVEREST Consulting ! 🎉`;

    return (
      <div className="mx-auto max-w-xl">
        <div className="card text-center">
          <PartyPopper className="mx-auto text-emerald-400" size={36} />
          <h1 className="mt-3 text-2xl font-bold text-white">Votre espace est prêt</h1>
          <p className="mt-1 text-sm text-muted">{created.name} a été ajouté à votre portefeuille.</p>
        </div>

        <div className="card mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <MessageCircle size={16} className="text-emerald-400" /> Message WhatsApp de bienvenue
            </p>
            <DemoBadge />
          </div>
          <pre className="whitespace-pre-wrap rounded-lg border border-border bg-bg p-4 font-sans text-sm text-slate-200">
            {welcome}
          </pre>
          <p className="mt-2 text-xs text-muted">Envoi réel via l&apos;API Meta WhatsApp en phase server-backed.</p>
        </div>

        <div className="mt-5 flex gap-3">
          <Link href={`/app/clients/${created.id}`} className="btn-primary">
            Ouvrir la fiche client <ArrowRight size={16} />
          </Link>
          <Link href="/app/clients" className="btn-ghost">
            Retour aux clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft size={15} /> Retour aux clients
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-white">Bienvenue sur CLEVER</h1>
      <p className="text-sm text-muted">{STEPS.length} étapes · moins de 3 minutes.</p>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i < step ? "bg-emerald-600 text-white" : i === step ? "bg-primary text-white" : "bg-surface-2 text-muted"
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${i === step ? "text-slate-200" : "text-muted"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        ))}
      </div>

      <div className="card mt-6">
        {/* ── Étape 1 : Profil ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="label">Vous êtes…</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    { id: "INDIVIDUAL", icon: <UserIcon size={22} />, title: "Particulier", desc: "Salarié, indépendant, micro-entrepreneur" },
                    { id: "COMPANY", icon: <Building2 size={22} />, title: "Entreprise", desc: "SARL, SA, établissement, cabinet" },
                  ] as { id: ClientType; icon: ReactNode; title: string; desc: string }[]
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      type === opt.id ? "border-primary bg-primary/10" : "border-border hover:bg-surface-2"
                    }`}
                  >
                    <span className={type === opt.id ? "text-primary" : "text-slate-300"}>{opt.icon}</span>
                    <p className="mt-2 text-sm font-semibold text-slate-100">{opt.title}</p>
                    <p className="text-xs text-muted">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Forfait</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      tier === t ? "border-primary bg-primary/15 text-primary" : "border-border text-slate-300"
                    }`}
                  >
                    {TIER_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Étape 2 : Situation (+ NIU) ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="label">Nom / Raison sociale</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="TCC SARL" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@exemple.cm" />
              </div>
              <div>
                <label className="label">Numéro WhatsApp</label>
                <input className="input font-mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237690000000" />
              </div>
            </div>
            <div>
              <label className="label">Pays fiscal (détermine le taux de TVA)</label>
              <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-2">
                Sources de revenus <DemoBadge />
              </label>
              <div className="flex flex-wrap gap-2">
                {REVENUE_SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(sources, setSources, s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      sources.includes(s) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted hover:text-slate-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Module NIU — REDESIGN §8 */}
            <div className="rounded-lg border border-border bg-bg p-3">
              <label className="label flex items-center gap-2">
                <Landmark size={13} /> NIU (Numéro d&apos;Identifiant Unique)
              </label>
              <input
                className="input font-mono"
                value={niu}
                onChange={(e) => setNiu(e.target.value)}
                placeholder="P0000000000000X"
                disabled={niuRequested}
              />
              {niuRequested ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Check size={13} /> Demande de création envoyée — TCCS la soumettra à la DGI sous 48h. <DemoBadge />
                </p>
              ) : (
                <button type="button" onClick={() => setNiuModal(true)} className="mt-2 text-xs text-primary hover:underline">
                  Pas de NIU ? Créez-le gratuitement avec TCCS →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Étape 3 : Objectifs ── */}
        {step === 2 && (
          <div className="space-y-3">
            <label className="label flex items-center gap-2">
              Vos objectifs <DemoBadge />
            </label>
            <p className="text-xs text-muted">Chaque objectif activera les blocs correspondants dans les tableaux de bord.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CLIENT_GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle(goals, setGoals, g)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm ${
                    goals.includes(g) ? "border-primary bg-primary/10 text-primary" : "border-border text-slate-300 hover:bg-surface-2"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                      goals.includes(g) ? "bg-primary text-white" : "border border-border"
                    }`}
                  >
                    {goals.includes(g) && <Check size={11} />}
                  </span>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Étape 4 : Récapitulatif ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="label">Comptable TCCS assigné</label>
              <select className="input" value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
                <option value="">— Assigner plus tard —</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === "MANAGER_N2" ? "Manager" : "Collaborateur"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-100">Vérifiez les informations</p>
              <dl className="divide-y divide-border rounded-lg border border-border">
                {[
                  ["Type", type === "COMPANY" ? "Entreprise" : "Particulier"],
                  ["Forfait", TIER_LABELS[tier]],
                  ["Nom", name],
                  ["Email", email],
                  ["WhatsApp", phone],
                  ["Pays", COUNTRIES.find((c) => c.code === country)?.label ?? country],
                  ["NIU", niuRequested ? "Demande en cours (démo)" : niu || "—"],
                  ["Sources de revenus", sources.length ? sources.join(", ") : "—"],
                  ["Objectifs", goals.length ? goals.join(", ") : "—"],
                  ["Comptable", assignedName],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
                    <dt className="shrink-0 text-muted">{k}</dt>
                    <dd className="text-right font-medium text-slate-200">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-xs text-muted">NIU, sources de revenus et objectifs sont collectés en démo (non persistés par l&apos;API actuelle).</p>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-6 flex items-center justify-between">
          <button onClick={back} disabled={step === 0} className="btn-ghost disabled:opacity-40">
            <ArrowLeft size={16} /> Retour
          </button>
          <span className="text-xs text-muted">Étape {step + 1}/{STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-primary">
              Continuer <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={create} disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Activer l&apos;espace
            </button>
          )}
        </div>
      </div>

      {/* Modale création NIU — REDESIGN §8 */}
      {niuModal && (
        <NiuModal
          onClose={() => setNiuModal(false)}
          onSubmit={() => {
            setNiuRequested(true);
            setNiuModal(false);
            toast.success("Demande de NIU enregistrée — TCCS la soumettra à la DGI sous 48h (démo).");
          }}
        />
      )}
    </div>
  );
}

function NiuModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [cni, setCni] = useState("");
  const [adresse, setAdresse] = useState("");
  const [activite, setActivite] = useState("");
  const valid = cni.trim().length >= 4 && adresse.trim().length >= 3 && activite.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Landmark size={18} /> Créer mon NIU
          </h3>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted">
          TCCS soumet votre demande à la DGI. Renseignez vos informations — vous recevrez votre NIU pré-rempli sous 48h. <DemoBadge />
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
            <label className="label">Activité</label>
            <input className="input" value={activite} onChange={(e) => setActivite(e.target.value)} placeholder="Commerce, prestation de services…" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">
            Annuler
          </button>
          <button onClick={onSubmit} disabled={!valid} className="btn-primary">
            Soumettre à la DGI
          </button>
        </div>
      </div>
    </div>
  );
}
