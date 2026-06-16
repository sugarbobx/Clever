"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Camera, Landmark, Wifi, PartyPopper } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import { DemoBadge } from "@/components/ui/Misc";
import { NiuModal } from "@/components/niu/NiuModal";

/* ── Référentiels ── */
const COUNTRIES = [
  { code: "CM", label: "Cameroun" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "GA", label: "Gabon" },
  { code: "AUTRE", label: "Autre OHADA" },
];
const SOURCES = ["Salaire", "Freelance / BIC", "Revenus fonciers", "Dividendes / IRCM", "BNC", "Autre"];
const REGIMES = ["Impôt libératoire", "Régime simplifié", "Régime réel", "Je ne sais pas"];
const OBJECTIFS = [
  "Être en règle fiscalement (IRPP, déclarations)",
  "Suivre mes revenus et dépenses",
  "Lancer ou gérer une activité indépendante",
  "Préparer un achat immobilier",
  "Constituer une épargne ou un patrimoine",
  "Faire face à un contrôle fiscal",
  "Autre",
];
const FORMES = ["SARL", "SA", "SAS", "Entreprise individuelle", "Association", "Autre"];
const SECTEURS = ["Commerce", "Services", "BTP", "Agriculture", "Industrie", "Autre"];
const EMPLOYES = ["1-5", "6-20", "21-50", "50+"];
const LOGICIELS = ["QuickBooks", "Sage", "Excel", "Aucun", "Autre"];
const EXPERTS = ["Oui, externe", "Oui, interne", "Non"];
const SERVICES = [
  "Tenue comptable externalisée",
  "Déclarations fiscales (TVA, IS, DSF)",
  "Bulletins de paie et CNPS",
  "Conformité légale OHADA (RCCM, PV AG, statuts)",
  "Assistance contrôle fiscal DGI",
  "Business plan et prévisionnel financier",
  "Commissariat aux comptes",
  "Évaluation d'entreprise",
];
const COMPTABLE = { name: "Awa Ndiaye", specialite: "Fiscalité & SYSCOHADA" };

interface OData {
  firstName: string;
  lastName: string;
  phone: string;
  photo?: string;
  poste?: string;
  // individuel
  country: string;
  niu: string;
  sources: string[];
  regime: string;
  objectives: string[];
  objectiveOther: string;
  // entreprise
  companyName: string;
  forme: string;
  secteur: string;
  paysImmat: string;
  rccm: string;
  niuEntreprise: string;
  employes: string;
  logiciel: string;
  derniereCloture: string;
  expert: string;
  regimeCompany: string;
  qboConnected: boolean;
  services: string[];
}

const emptyData = (firstName = "", lastName = ""): OData => ({
  firstName,
  lastName,
  phone: "",
  country: "CM",
  niu: "",
  sources: [],
  regime: "",
  objectives: [],
  objectiveOther: "",
  poste: "",
  companyName: "",
  forme: "",
  secteur: "",
  paysImmat: "CM",
  rccm: "",
  niuEntreprise: "",
  employes: "",
  logiciel: "",
  derniereCloture: "",
  expert: "",
  regimeCompany: "",
  qboConnected: false,
  services: [],
});

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isCompany = user?.role === "CLIENT_COMPANY";
  const storageKey = user ? `clever:onboarding:${user.id}` : null;

  // Gating : seuls les clients non-onboardés ; sinon redirection.
  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/login");
    if (user.role !== "CLIENT_INDIVIDUAL" && user.role !== "CLIENT_COMPANY") return router.replace("/app/dashboard");
    if (user.onboardingCompleted) return router.replace("/client/dashboard");
  }, [user, loading, router]);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OData>(() => emptyData());
  const [busy, setBusy] = useState(false);
  const [niuModal, setNiuModal] = useState(false);

  // Hydratation depuis localStorage (reprise) + préremplissage nom.
  useEffect(() => {
    if (!storageKey || !user) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setData({ ...emptyData(), ...JSON.parse(saved) });
        return;
      } catch {
        /* ignore */
      }
    }
    const [fn, ...rest] = user.name.split(" ");
    setData(emptyData(fn, rest.join(" ")));
  }, [storageKey, user]);

  function patch(p: Partial<OData>) {
    setData((d) => {
      const next = { ...d, ...p };
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  const STEP_LABELS = isCompany
    ? ["Profil", "Entreprise", "Comptabilité", "Services", "Récapitulatif"]
    : ["Profil", "Situation fiscale", "Objectifs", "Récapitulatif"];
  const total = STEP_LABELS.length;
  const isLast = step === total - 1;

  const valid = useMemo(() => stepValid(step, isCompany, data), [step, isCompany, data]);

  async function saveStep() {
    // Démo : sauvegarde d'étape best-effort (non persistée côté serveur).
    await api.post("/users/onboarding", { step, data });
  }

  async function next() {
    if (!valid) return toast.error("Veuillez compléter les champs requis.");
    setBusy(true);
    await saveStep();
    setBusy(false);
    setStep((s) => Math.min(total - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function finish() {
    setBusy(true);
    // NIU absent → on propose la création depuis le dashboard.
    const niuVal = isCompany ? data.niuEntreprise : data.niu;
    if (user) {
      if (!niuVal.trim()) localStorage.setItem(`clever:niu-pending:${user.id}`, "true");
      else localStorage.setItem(`clever:niu:${user.id}`, niuVal.trim());
    }
    const { error } = await api.post("/users/onboarding", { completed: true });
    if (error) {
      setBusy(false);
      return toast.error(error);
    }
    if (storageKey) localStorage.removeItem(storageKey);
    // Rafraîchir l'état user (onboardingCompleted = true).
    await useAuth.getState().loadMe();
    setBusy(false);
    router.replace("/onboarding/kyc");
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-white">C</span>
        <span className="text-2xl font-extrabold tracking-tight text-white">CLEVER</span>
      </div>

      <div className="card">
        {/* Barre de progression globale */}
        <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>

        {/* Stepper */}
        <div className="mb-6 mt-4 flex items-center gap-1">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-1">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i < step ? "bg-emerald-600 text-white" : i === step ? "bg-primary text-white" : "bg-surface-2 text-muted"
                }`}
              >
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`hidden text-[11px] sm:block ${i === step ? "text-slate-200" : "text-muted"}`}>{label}</span>
              {i < total - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {/* Contenu d'étape */}
        {isCompany ? (
          <CompanySteps step={step} data={data} patch={patch} onNiu={() => setNiuModal(true)} comptable={COMPTABLE} />
        ) : (
          <IndividualSteps step={step} data={data} patch={patch} comptable={COMPTABLE} />
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button onClick={back} disabled={step === 0 || busy} className="btn-ghost disabled:opacity-40">
            <ArrowLeft size={16} /> Retour
          </button>
          <span className="text-xs text-muted">Étape {step + 1} sur {total}</span>
          {isLast ? (
            <button onClick={finish} disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Continuer vers la vérification
            </button>
          ) : (
            <button onClick={next} disabled={!valid || busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <>Continuer <ArrowRight size={16} /></>}
            </button>
          )}
        </div>
      </div>

      {niuModal && (
        <NiuModal
          onClose={() => setNiuModal(false)}
          onSubmitted={() => {
            if (user) localStorage.setItem(`clever:niu-pending:${user.id}`, "requested");
          }}
        />
      )}
    </div>
  );
}

function stepValid(step: number, isCompany: boolean, d: OData): boolean {
  const profileOk = d.firstName.trim().length > 0 && d.lastName.trim().length > 0;
  if (isCompany) {
    if (step === 0) return profileOk;
    if (step === 1) return d.companyName.trim().length > 1 && Boolean(d.forme && d.secteur && d.employes);
    if (step === 2) return Boolean(d.logiciel && d.expert && d.regimeCompany);
    if (step === 3) return d.services.length >= 1;
    return true;
  }
  if (step === 0) return profileOk && Boolean(d.country);
  if (step === 1) return d.sources.length >= 1 && Boolean(d.regime);
  if (step === 2) return d.objectives.length >= 1 && (!d.objectives.includes("Autre") || d.objectiveOther.trim().length > 0);
  return true;
}

/* ── Composants partagés ── */
function PhotoUpload({ photo, onChange }: { photo?: string; onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange(r.result as string);
    r.readAsDataURL(f);
  }
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()} className="group relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Aperçu" className="h-full w-full object-cover" />
        ) : (
          <Camera size={20} className="text-muted" />
        )}
      </button>
      <button type="button" onClick={() => ref.current?.click()} className="text-sm font-medium text-primary hover:underline">
        {photo ? "Changer la photo" : "Ajouter une photo (optionnel)"}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </div>
  );
}

function Chips({ options, value, onToggle }: { options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted hover:text-slate-200"}`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ComptableCard({ comptable }: { comptable: { name: string; specialite: string } }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
        {comptable.name.split(" ").map((w) => w[0]).join("")}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-100">{comptable.name}</p>
        <p className="text-xs text-muted">{comptable.specialite} · comptable TCCS assigné</p>
      </div>
    </div>
  );
}

/* ── Parcours individuel ── */
function IndividualSteps({ step, data, patch, comptable }: { step: number; data: OData; patch: (p: Partial<OData>) => void; comptable: { name: string; specialite: string } }) {
  const toggle = (list: keyof OData, v: string) => {
    const cur = data[list] as string[];
    patch({ [list]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<OData>);
  };

  if (step === 0)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Votre profil</h2>
        <PhotoUpload photo={data.photo} onChange={(p) => patch({ photo: p })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom"><input className="input" value={data.firstName} onChange={(e) => patch({ firstName: e.target.value })} /></Field>
          <Field label="Nom"><input className="input" value={data.lastName} onChange={(e) => patch({ lastName: e.target.value })} /></Field>
        </div>
        <Field label="Téléphone"><input className="input font-mono" value={data.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+237690000000" /></Field>
        <Field label="Pays de résidence fiscale">
          <select className="input" value={data.country} onChange={(e) => patch({ country: e.target.value })}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </Field>
      </div>
    );

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Votre situation fiscale</h2>
        <Field label="NIU (Numéro d'Identifiant Unique)">
          <input className="input font-mono" value={data.niu} onChange={(e) => patch({ niu: e.target.value })} placeholder="P0000000000000X" />
          {!data.niu.trim() && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <Landmark size={12} /> Pas de NIU ? Vous pourrez en créer un gratuitement avec TCCS après l'inscription, depuis votre tableau de bord.
            </p>
          )}
        </Field>
        <Field label="Sources de revenus (au moins une)"><Chips options={SOURCES} value={data.sources} onToggle={(v) => toggle("sources", v)} /></Field>
        <Field label="Régime fiscal">
          <select className="input" value={data.regime} onChange={(e) => patch({ regime: e.target.value })}>
            <option value="">— Choisir —</option>
            {REGIMES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
    );

  if (step === 2)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Vos objectifs</h2>
        <p className="text-sm text-muted">Sélectionnez ce qui compte pour vous (au moins un).</p>
        <Chips options={OBJECTIFS} value={data.objectives} onToggle={(v) => toggle("objectives", v)} />
        {data.objectives.includes("Autre") && (
          <Field label="Précisez"><input className="input" value={data.objectiveOther} onChange={(e) => patch({ objectiveOther: e.target.value })} /></Field>
        )}
      </div>
    );

  // Récapitulatif
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Votre espace est prêt</h2>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {[
          ["Nom", `${data.firstName} ${data.lastName}`],
          ["Téléphone", data.phone || "—"],
          ["Pays fiscal", COUNTRIES.find((c) => c.code === data.country)?.label ?? data.country],
          ["NIU", data.niu || "À créer après l'inscription"],
          ["Sources de revenus", data.sources.join(", ") || "—"],
          ["Régime fiscal", data.regime || "—"],
          ["Objectifs", [...data.objectives.filter((o) => o !== "Autre"), data.objectives.includes("Autre") ? data.objectiveOther : ""].filter(Boolean).join(", ") || "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="shrink-0 text-muted">{k}</dt>
            <dd className="text-right font-medium text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>
      <ComptableCard comptable={comptable} />
      <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm text-slate-200">
        Votre espace est prêt. <strong>{comptable.name}</strong> vous contactera dans les 24h.
      </p>
    </div>
  );
}

/* ── Parcours entreprise ── */
function CompanySteps({ step, data, patch, onNiu, comptable }: { step: number; data: OData; patch: (p: Partial<OData>) => void; onNiu: () => void; comptable: { name: string; specialite: string } }) {
  const toggle = (list: keyof OData, v: string) => {
    const cur = data[list] as string[];
    patch({ [list]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<OData>);
  };

  if (step === 0)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Votre profil personnel</h2>
        <PhotoUpload photo={data.photo} onChange={(p) => patch({ photo: p })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom"><input className="input" value={data.firstName} onChange={(e) => patch({ firstName: e.target.value })} /></Field>
          <Field label="Nom"><input className="input" value={data.lastName} onChange={(e) => patch({ lastName: e.target.value })} /></Field>
        </div>
        <Field label="Poste dans l'entreprise"><input className="input" value={data.poste} onChange={(e) => patch({ poste: e.target.value })} placeholder="Gérant, DAF…" /></Field>
        <Field label="Téléphone"><input className="input font-mono" value={data.phone} onChange={(e) => patch({ phone: e.target.value })} placeholder="+237690000000" /></Field>
      </div>
    );

  if (step === 1)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Votre entreprise</h2>
        <Field label="Raison sociale"><input className="input" value={data.companyName} onChange={(e) => patch({ companyName: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Forme juridique">
            <select className="input" value={data.forme} onChange={(e) => patch({ forme: e.target.value })}>
              <option value="">— Choisir —</option>{FORMES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Secteur d'activité">
            <select className="input" value={data.secteur} onChange={(e) => patch({ secteur: e.target.value })}>
              <option value="">— Choisir —</option>{SECTEURS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pays d'immatriculation">
            <select className="input" value={data.paysImmat} onChange={(e) => patch({ paysImmat: e.target.value })}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Nombre d'employés">
            <select className="input" value={data.employes} onChange={(e) => patch({ employes: e.target.value })}>
              <option value="">— Choisir —</option>{EMPLOYES.map((e) => <option key={e}>{e}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Numéro RCCM (optionnel)"><input className="input font-mono" value={data.rccm} onChange={(e) => patch({ rccm: e.target.value })} /></Field>
        <Field label="NIU entreprise (optionnel)">
          <input className="input font-mono" value={data.niuEntreprise} onChange={(e) => patch({ niuEntreprise: e.target.value })} placeholder="M0000000000000X" />
          {!data.niuEntreprise.trim() && (
            <button type="button" onClick={onNiu} className="mt-1.5 text-xs text-primary hover:underline">
              Pas de NIU ? Le créer gratuitement avec TCCS →
            </button>
          )}
        </Field>
      </div>
    );

  if (step === 2)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Situation comptable actuelle</h2>
        <Field label="Logiciel comptable actuel">
          <select className="input" value={data.logiciel} onChange={(e) => patch({ logiciel: e.target.value })}>
            <option value="">— Choisir —</option>{LOGICIELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
        {data.logiciel === "QuickBooks" && (
          <button
            type="button"
            onClick={() => { patch({ qboConnected: true }); toast.success("QuickBooks connecté (démo)."); }}
            className={`btn-ghost ${data.qboConnected ? "border-emerald-500/40 text-emerald-400" : ""}`}
          >
            <Wifi size={15} /> {data.qboConnected ? "QuickBooks connecté ✓" : "Connecter QuickBooks maintenant"} <DemoBadge />
          </button>
        )}
        <Field label="Dernière clôture comptable (optionnel)"><input className="input" type="date" value={data.derniereCloture} onChange={(e) => patch({ derniereCloture: e.target.value })} /></Field>
        <Field label="Expert-comptable actuel">
          <select className="input" value={data.expert} onChange={(e) => patch({ expert: e.target.value })}>
            <option value="">— Choisir —</option>{EXPERTS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Régime fiscal">
          <select className="input" value={data.regimeCompany} onChange={(e) => patch({ regimeCompany: e.target.value })}>
            <option value="">— Choisir —</option>{REGIMES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>
    );

  if (step === 3)
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Services souhaités</h2>
        <p className="text-sm text-muted">Sélectionnez les services qui vous intéressent (au moins un).</p>
        <Chips options={SERVICES} value={data.services} onToggle={(v) => toggle("services", v)} />
      </div>
    );

  // Récapitulatif
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white"><PartyPopper size={20} className="text-emerald-400" /> Récapitulatif</h2>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {[
          ["Entreprise", data.companyName || "—"],
          ["Forme / secteur", [data.forme, data.secteur].filter(Boolean).join(" · ") || "—"],
          ["Pays / employés", [COUNTRIES.find((c) => c.code === data.paysImmat)?.label, data.employes].filter(Boolean).join(" · ") || "—"],
          ["NIU entreprise", data.niuEntreprise || "À créer après l'inscription"],
          ["Logiciel", data.logiciel || "—"],
          ["Services", data.services.join(", ") || "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="shrink-0 text-muted">{k}</dt>
            <dd className="text-right font-medium text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>
      {data.qboConnected && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
          <Wifi size={14} /> QuickBooks synchronisé ✓
        </span>
      )}
      <ComptableCard comptable={comptable} />
    </div>
  );
}
