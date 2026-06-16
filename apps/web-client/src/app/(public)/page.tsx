import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  ReceiptText,
  Handshake,
  TrendingUp,
  Users,
  ShieldCheck,
  Briefcase,
  LayoutDashboard,
  Brain,
  Scale,
  CheckCircle2,
  UserCog,
  HeartHandshake,
  UserCheck,
  GraduationCap,
  User,
  Building2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "CLEVER — Gérez votre entreprise comme elle le mérite",
  description:
    "CLEVER centralise comptabilité, fiscalité, paie, conformité OHADA et pilotage d'équipe, avec une IA qui cite les articles de loi (CGI, SYSCOHADA, OHADA). Tarifs dès 19 900 XAF/mois.",
  robots: { index: true, follow: true },
};

const PROOF = [
  { label: "SYSCOHADA", desc: "Plan comptable OHADA" },
  { label: "CGI", desc: "Codes fiscaux en vigueur" },
  { label: "OHADA", desc: "9 Actes Uniformes" },
  { label: "QuickBooks", desc: "Synchronisation native" },
  { label: "IA juridique", desc: "Claude — analyse fondée" },
];

const DOMAINES = [
  { icon: Calculator, title: "Comptabilité", desc: "Tenue SYSCOHADA automatisée et synchronisée avec QuickBooks." },
  { icon: ReceiptText, title: "Fiscalité", desc: "TVA, IRPP, IS calculés selon le CGI et la DGI, base légale citée." },
  { icon: Handshake, title: "Fournisseurs & contrats", desc: "Suivi des engagements, échéances et pièces justificatives." },
  { icon: TrendingUp, title: "Trésorerie & cash flow", desc: "Soldes multi-banques et projections de trésorerie." },
  { icon: Users, title: "Paie & RH", desc: "Bulletins, cotisations CNPS et gestion des collaborateurs." },
  { icon: ShieldCheck, title: "Conformité légale OHADA", desc: "RCCM, statuts, registres et calendrier des obligations." },
  { icon: Briefcase, title: "Projets & facturation", desc: "Facturation client et suivi de la rentabilité par mission." },
  { icon: LayoutDashboard, title: "Pilotage dirigeant", desc: "Tableaux de bord et KPIs consolidés en temps réel." },
  { icon: Brain, title: "Classification IA", desc: "Reconnaissance des documents et écriture comptable proposée." },
];

const CORPUS = ["CGI Cameroun", "CGI Côte d'Ivoire", "CGI Gabon", "Traité OHADA", "9 Actes Uniformes", "SYSCOHADA révisé 2017", "Circulaires DGI", "Jurisprudence CCJA"];

const ROLES = [
  { icon: UserCog, title: "Manager", desc: "Portefeuille clients, file globale, objectifs d'équipe, permissions et audit." },
  { icon: HeartHandshake, title: "Ressources Humaines", desc: "Paie, notes de frais, CNPS et évaluation des stagiaires." },
  { icon: UserCheck, title: "Collaborateur", desc: "Validation des documents, dossiers clients et messagerie." },
  { icon: GraduationCap, title: "Stagiaire", desc: "Tâches assignées, brouillons, objectifs et progression encadrée." },
  { icon: User, title: "Client particulier", desc: "Simulateur IRPP, comptabilité personnelle et accompagnement TCCS." },
  { icon: Building2, title: "Client entreprise", desc: "Portail à 5 sections : documents, états financiers, conformité OHADA." },
];

const TIERS = [
  {
    name: "Déclarant Solo",
    price: "19 900",
    audience: "Particuliers & micro-entrepreneurs",
    features: ["30 documents/mois", "Extraction automatique par IA", "Calcul IRPP personnel", "Alertes d'échéances"],
    recommended: false,
  },
  {
    name: "Comptable Pro",
    price: "59 900",
    audience: "PME et freelances actifs",
    features: [
      "Documents illimités",
      "Synchronisation QuickBooks temps réel",
      "Tableau de bord TVA dynamique",
      "Conformité OHADA suivie",
      "Chat avec votre comptable",
    ],
    recommended: true,
  },
  {
    name: "Grand Compte",
    price: "199 000",
    audience: "Entreprises & cabinets",
    features: ["Tout Comptable Pro inclus", "Multi-utilisateurs & support dédié", "Commissariat aux comptes (option)", "Assistance contrôle fiscal DGI", "Dossier de financement bancaire"],
    recommended: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-extrabold text-white">C</span>
          <span className="text-xl font-extrabold tracking-tight text-white">CLEVER</span>
        </div>
        <Link href="/login" className="btn-primary">
          Connexion
        </Link>
      </header>

      {/* 1 — HERO */}
      <section className="mx-auto max-w-4xl px-6 pb-14 pt-12 text-center">
        <span className="demo-badge mb-4">THECLEVEREST Consulting</span>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
          Gérez votre entreprise comme elle le <span className="text-primary">mérite vraiment</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
          CLEVER centralise comptabilité, fiscalité, paie, conformité légale et pilotage d&apos;équipe — en parfaite
          conformité avec le droit OHADA et les codes fiscaux en vigueur.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-primary">
            Démarrer <ArrowRight size={16} />
          </Link>
          <a href="#cerveau" className="btn-ghost">
            Voir la démo
          </a>
        </div>
      </section>

      {/* 2 — PROOF BAR */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {PROOF.map((p) => (
            <div key={p.label} className="card flex items-center gap-3 py-3">
              <BadgeCheck size={20} className="shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-100">{p.label}</p>
                <p className="truncate text-xs text-muted">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 — DOMAINES */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">9 domaines, une seule plateforme</h2>
          <p className="mt-2 text-muted">Tout ce dont votre entreprise a besoin pour être pilotée avec rigueur.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINES.map((d) => (
            <div key={d.title} className="card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <d.icon size={20} />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-100">{d.title}</p>
              <p className="mt-1 text-sm text-muted">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 — CERVEAU IA */}
      <section id="cerveau" className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Brain size={14} /> Le cerveau CLEVER
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">Une IA qui cite la loi</h2>
            <p className="mt-3 text-slate-300">
              CLEVER ne devine pas. Il cite les articles de loi. Chaque assertion fiscale est ancrée dans le CGI en
              vigueur, chaque compte SYSCOHADA est justifié, chaque alerte est légalement fondée.
            </p>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Corpus juridiques intégrés</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CORPUS.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2.5 py-1 text-xs text-slate-300">
                  <Scale size={11} className="text-muted" /> {c}
                </span>
              ))}
            </div>
          </div>

          {/* Simulation d'analyse */}
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-200">TOTAL Cameroun SA — carburant</p>
              <span className="demo-badge">analyse IA</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-[10px] uppercase text-muted">Montant TTC</p>
                <p className="font-mono text-slate-100">37 985 XAF</p>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-[10px] uppercase text-muted">Date</p>
                <p className="font-mono text-slate-100">10/06/2024</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-bg p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400">Débit</span>
                <span className="text-slate-200"><span className="font-mono">6064</span> Carburants</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-blue-400">TVA</span>
                <span className="text-slate-200"><span className="font-mono">4451</span> TVA récupérable · 7 312 XAF</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-red-400">Crédit</span>
                <span className="text-slate-200"><span className="font-mono">4011</span> Fournisseurs</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <ShieldCheck size={16} /> CONFORME
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-muted">
                <Scale size={11} /> CGI CM Art.149 al.1
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5 — RÔLES */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Un espace pour chaque profil</h2>
          <p className="mt-2 text-muted">Six rôles, des droits adaptés, une collaboration fluide.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.title} className="card">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-slate-200">
                <r.icon size={20} />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-100">{r.title}</p>
              <p className="mt-1 text-sm text-muted">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 — TARIFICATION */}
      <section id="tarifs" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Une tarification claire</h2>
          <p className="mt-2 text-muted">Choisissez l&apos;offre adaptée à votre structure.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`card relative flex flex-col ${t.recommended ? "border-primary ring-1 ring-primary" : ""}`}>
              {t.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                  RECOMMANDÉ
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-100">{t.name}</h3>
              <p className="mt-1 text-sm text-muted">{t.audience}</p>
              <p className="mt-4 text-3xl font-extrabold text-white">
                {t.price} <span className="text-base font-medium text-muted">XAF / mois</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className={`mt-6 w-full ${t.recommended ? "btn-primary" : "btn-ghost"}`}>
                Choisir
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 7 — FOOTER CTA */}
      <section className="mx-auto max-w-3xl px-6 pb-16 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Prêt à donner à votre entreprise les outils qu&apos;elle mérite ?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">
          Rejoignez les entreprises qui pilotent leur activité avec rigueur, conformité et sérénité — grâce à CLEVER et
          THECLEVEREST Consulting.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-primary">
            Démarrer <ArrowRight size={16} />
          </Link>
          <a href="#tarifs" className="btn-ghost">
            Voir les tarifs
          </a>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        CLEVER — THECLEVEREST Consulting · Yaoundé, Cameroun · <span className="demo-badge">démo locale</span>
      </footer>
    </div>
  );
}
