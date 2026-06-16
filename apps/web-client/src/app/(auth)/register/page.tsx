"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, User, Building2, type LucideIcon } from "lucide-react";

interface AccountType {
  slug: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

const TYPES: AccountType[] = [
  { slug: "particulier", title: "Particulier", desc: "Fiscalité personnelle, suivi de patrimoine", icon: User },
  { slug: "entreprise", title: "Entreprise", desc: "Comptabilité, fiscalité, conformité OHADA", icon: Building2 },
];

export default function RegisterTypePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<AccountType | null>(null);

  const blocked = !selected;

  function next() {
    if (!selected) return;
    router.push(`/register/${selected.slug}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-white">C</span>
          <span className="text-2xl font-extrabold tracking-tight text-white">CLEVER</span>
        </div>

        <div className="card">
          <h1 className="text-lg font-bold text-slate-100">Créer un compte</h1>
          <p className="mt-1 text-sm text-muted">Quel type de compte souhaitez-vous créer ?</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => {
              const active = selected?.slug === t.slug;
              return (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => setSelected(t)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    active ? "border-primary bg-primary/10" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <span className={active ? "text-primary" : "text-slate-300"}>
                    <t.icon size={22} />
                  </span>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{t.title}</p>
                  <p className="text-xs text-muted">{t.desc}</p>
                </button>
              );
            })}
          </div>

          <button onClick={next} disabled={blocked} className="btn-primary mt-6 w-full justify-center">
            Continuer <ArrowRight size={16} />
          </button>

          <p className="mt-3 text-center text-[11px] text-muted">
            Les comptes collaborateur, stagiaire, Manager et RH sont créés par le cabinet.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          <Link href="/login" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft size={13} /> Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
