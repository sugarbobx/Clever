"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/stores/auth.store";
import type { Role } from "@/lib/types";

const SLUGS: Record<string, { role: Role; title: string }> = {
  particulier: { role: "CLIENT_INDIVIDUAL", title: "Particulier" },
  entreprise: { role: "CLIENT_COMPANY", title: "Entreprise" },
};

export default function RegisterFormPage() {
  const { type } = useParams<{ type: string }>();
  const router = useRouter();
  const { register } = useAuth();
  const cfg = SLUGS[type];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // Type inconnu (ou non self-service) → retour au choix.
  useEffect(() => {
    if (type && !cfg) router.replace("/register");
  }, [type, cfg, router]);

  if (!cfg) return null;

  const emailValid = /\S+@\S+\.\S+/.test(email);
  const pwValid = password.length >= 8;
  const match = password === confirm && confirm.length > 0;
  const canSubmit = Boolean(firstName.trim() && lastName.trim() && emailValid && pwValid && match) && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) return toast.error("Email invalide.");
    if (!pwValid) return toast.error("Le mot de passe doit faire au moins 8 caractères.");
    if (!match) return toast.error("Les mots de passe ne correspondent pas.");

    setBusy(true);
    const res = await register({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      role: cfg!.role,
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Échec de l'inscription.");
    toast.success("Compte créé. Bienvenue !");
    router.replace("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-white">C</span>
          <span className="text-2xl font-extrabold tracking-tight text-white">CLEVER</span>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Créer un compte — {cfg.title}</h1>
            <p className="text-sm text-muted">Renseignez vos informations pour commencer.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Masquer" : "Afficher"} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-slate-200">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password.length > 0 && !pwValid && <p className="mt-1 text-xs text-amber-400">Au moins 8 caractères.</p>}
          </div>

          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input className="input" type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            {confirm.length > 0 && !match && <p className="mt-1 text-xs text-red-400">Les mots de passe ne correspondent pas.</p>}
          </div>

          <div>
            <label className="label">Téléphone (optionnel)</label>
            <input className="input font-mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237690000000" />
          </div>

          <button className="btn-primary w-full justify-center" disabled={!canSubmit}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/register" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft size={13} /> Changer de type de compte
          </Link>
        </p>
      </div>
    </div>
  );
}
