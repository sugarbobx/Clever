"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck, CreditCard, Camera, FileText, UploadCloud } from "lucide-react";
import { useAuth } from "@/stores/auth.store";
import { DemoBadge } from "@/components/ui/Misc";

type DocKey = "identity" | "selfie" | "address";

const STEPS: { key: DocKey; label: string; title: string; hint: string; icon: typeof CreditCard }[] = [
  { key: "identity", label: "Identité", title: "Pièce d'identité", hint: "CNI (recto-verso) ou passeport en cours de validité.", icon: CreditCard },
  { key: "selfie", label: "Selfie", title: "Photo de vérification (selfie)", hint: "Une photo de votre visage, bien éclairée, sans lunettes.", icon: Camera },
  { key: "address", label: "Adresse", title: "Justificatif de domicile", hint: "Facture (Eneo, Camwater…) ou attestation de moins de 3 mois.", icon: FileText },
];

export default function KycPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Record<DocKey, string | null>>({ identity: null, selfie: null, address: null });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  const total = STEPS.length;
  const current = STEPS[step];
  const isLast = step === total - 1;
  const hasFile = Boolean(files[current.key]);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setFiles((prev) => ({ ...prev, [current.key]: r.result as string }));
    r.readAsDataURL(f);
  }

  function next() {
    if (!hasFile) return toast.error("Veuillez téléverser le document.");
    setStep((s) => Math.min(total - 1, s + 1));
  }

  function finish() {
    setBusy(true);
    // Démo : pas de vérification d'identité réelle (KYC simulé).
    setTimeout(() => {
      setBusy(false);
      toast.success("Documents reçus. Vérification d'identité en cours (démo).");
      router.replace("/client/dashboard");
    }, 500);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const Icon = current.icon;

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-8">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-white">C</span>
        <span className="text-2xl font-extrabold tracking-tight text-white">CLEVER</span>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          <h1 className="text-lg font-bold text-white">Vérification d'identité</h1>
          <DemoBadge />
        </div>
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>

        {/* Stepper compact */}
        <div className="mb-5 flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center gap-1">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${files[s.key] ? "bg-emerald-600 text-white" : i === step ? "bg-primary text-white" : "bg-surface-2 text-muted"}`}>
                {files[s.key] ? <Check size={14} /> : i + 1}
              </div>
              <span className={`hidden text-[11px] sm:block ${i === step ? "text-slate-200" : "text-muted"}`}>{s.label}</span>
              {i < total - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><Icon size={16} /> {current.title}</p>
          <p className="text-sm text-muted">{current.hint}</p>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-bg px-3 py-8 text-center hover:bg-surface-2"
          >
            {files[current.key] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={files[current.key]!} alt="Aperçu" className="max-h-40 rounded-lg object-contain" />
            ) : (
              <>
                <UploadCloud size={26} className="text-muted" />
                <span className="text-sm text-slate-200">Cliquez pour téléverser</span>
                <span className="text-xs text-muted">JPG, PNG ou PDF</span>
              </>
            )}
          </button>
          {files[current.key] && (
            <button onClick={() => inputRef.current?.click()} className="text-xs text-primary hover:underline">Remplacer le document</button>
          )}
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={pick} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || busy} className="btn-ghost disabled:opacity-40">
            <ArrowLeft size={16} /> Retour
          </button>
          <span className="text-xs text-muted">Étape {step + 1} sur {total}</span>
          {isLast ? (
            <button onClick={finish} disabled={!hasFile || busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Terminer
            </button>
          ) : (
            <button onClick={next} disabled={!hasFile} className="btn-primary">
              Continuer <ArrowRight size={16} />
            </button>
          )}
        </div>

        <button onClick={() => router.replace("/client/dashboard")} className="mt-3 w-full text-center text-xs text-muted hover:text-primary">
          Compléter plus tard
        </button>
      </div>
    </div>
  );
}
