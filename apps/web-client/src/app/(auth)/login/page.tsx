"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth, homeForRole } from "@/stores/auth.store";

const DEMO_ACCOUNTS = [
  { email: "manager@clever.cm", label: "Manager", pw: "Manager@1234" },
  { email: "employee@clever.cm", label: "Collaborateur", pw: "Employee@1234" },
  { email: "trainee@clever.cm", label: "Stagiaire", pw: "Trainee@1234" },
  { email: "hr@clever.cm", label: "RH", pw: "Hr@1234" },
  { email: "particulier@clever.cm", label: "Client particulier", pw: "Client@1234" },
  { email: "entreprise@clever.cm", label: "Client entreprise", pw: "Client@1234" },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("manager@clever.cm");
  const [password, setPassword] = useState("Manager@1234");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok && res.user) {
      toast.success(`Bienvenue, ${res.user.name}`);
      const u = res.user;
      const isClient = u.role === "CLIENT_INDIVIDUAL" || u.role === "CLIENT_COMPANY";
      if (isClient && u.onboardingCompleted === false) router.replace("/onboarding");
      else router.replace(homeForRole(u.role));
    } else {
      toast.error(res.error ?? "Échec de la connexion.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-white">C</span>
          <span className="text-2xl font-extrabold tracking-tight text-white">CLEVER</span>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <h1 className="text-lg font-bold text-slate-100">Connexion</h1>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Se connecter"}
          </button>

          {/* Séparateur + création de compte */}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Link href="/register" className="btn-ghost w-full justify-center">
            Créer un compte
          </Link>
        </form>

        <div className="mt-5 card">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Comptes de démonstration</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.pw);
                }}
                className="rounded-lg border border-border px-3 py-2 text-left text-xs text-slate-300 hover:border-primary hover:bg-surface-2"
              >
                <span className="block font-semibold text-slate-200">{a.label}</span>
                <span className="text-muted">{a.email}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/" className="hover:text-primary">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
