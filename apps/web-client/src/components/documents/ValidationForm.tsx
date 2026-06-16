"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Pencil,
  X,
  Loader2,
  ReceiptText,
  Search,
  AlertTriangle,
  Scale,
  CalendarClock,
  ShieldCheck,
  History,
  FileText,
  User as UserIcon,
  Send,
  AlertOctagon,
} from "lucide-react";
import type { DocumentDTO, SysohadaAccountDTO } from "@/lib/types";
import { api, API_BASE } from "@/lib/api";
import { ConfidenceBadge } from "@/components/ui/StatusBadge";
import { DemoBadge } from "@/components/ui/Misc";
import { formatXAF, formatDate } from "@/lib/format";

const CLASS_NAMES: Record<number, string> = {
  1: "Ressources durables",
  2: "Actif immobilisé",
  3: "Stocks",
  4: "Tiers",
  5: "Trésorerie",
  6: "Charges",
  7: "Produits",
  8: "Autres charges / produits",
  9: "Analytique",
};

// Motifs de rejet — REDESIGN §1 (min. 1 obligatoire).
const REJECT_REASONS = [
  "Document illisible",
  "Montant incohérent",
  "Date manquante",
  "TVA incorrecte",
  "Document incomplet",
  "Doublon détecté",
  "Fournisseur non reconnu",
  "Hors périmètre client",
];

type Tab = "ocr" | "fiscal" | "audit";

export function ValidationForm({
  doc,
  accounts,
  canValidate,
  isTrainee = false,
}: {
  doc: DocumentDTO;
  accounts: SysohadaAccountDTO[];
  canValidate: boolean;
  isTrainee?: boolean;
}) {
  const router = useRouter();
  // Le stagiaire peut corriger l'OCR (mais pas valider) → champs éditables, action « soumettre ».
  const canEdit = canValidate || isTrainee;
  const [tab, setTab] = useState<Tab>("ocr");
  const [amount, setAmount] = useState(doc.amount ?? 0);
  const [code, setCode] = useState(doc.sysohadaCode ?? "");
  const [description, setDescription] = useState(doc.description ?? "");
  const [vendor, setVendor] = useState(doc.vendor ?? "");
  const [dateStr, setDateStr] = useState((doc.date ?? "").slice(0, 10));
  const [vatAmount, setVatAmount] = useState(doc.vatAmount ?? 0);
  const [categorie, setCategorie] = useState<string>("FACTURE_FOURNISSEUR");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState("");
  const [reporting, setReporting] = useState(false); // modale « Signaler un problème » (stagiaire)
  const [imgFailed, setImgFailed] = useState(false); // real receipt image unavailable → simulated preview

  // Démo : mapping comptable à 3 lignes dérivé du compte unique réel (doc.sysohadaCode).
  // La base ne stocke qu'un compte ; débit = compte de charge réel (éditable, soumis à l'API),
  // crédit (fournisseur) et TVA déductible sont des contreparties simulées côté front.
  const [creditCode, setCreditCode] = useState("4011");
  const tvaCode = doc.vatAmount && doc.vatAmount > 0 ? "4451" : null;

  const edited = amount !== (doc.amount ?? 0) || code !== (doc.sysohadaCode ?? "") || description !== (doc.description ?? "");

  const labelFor = (c: string) => accounts.find((a) => a.code === c)?.label ?? "";

  // Accounts matching the search, grouped by SYSCOHADA class.
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = (q ? accounts.filter((a) => a.code.includes(q) || a.label.toLowerCase().includes(q)) : accounts).slice(0, 60);
    const byClass = new Map<number, SysohadaAccountDTO[]>();
    for (const a of matched) {
      if (!byClass.has(a.class)) byClass.set(a.class, []);
      byClass.get(a.class)!.push(a);
    }
    return [...byClass.entries()].sort((a, b) => a[0] - b[0]);
  }, [search, accounts]);

  async function goToNextPending() {
    const { data } = await api.get<{ documents: DocumentDTO[] }>("/documents?status=PENDING_VALIDATION");
    const next = data?.documents.find((d) => d.id !== doc.id);
    router.push(next ? `/app/documents/${next.id}` : "/app/queue");
  }

  async function submit(action: "APPROVED" | "EDITED") {
    setBusy(true);
    const { error } = await api.put(`/validation/${doc.id}`, {
      action,
      finalAmount: action === "EDITED" ? amount : undefined,
      finalCode: action === "EDITED" ? code : undefined,
    });
    setBusy(false);
    if (error) return toast.error(error);
    toast.success("Document validé et enregistré dans QuickBooks (démo).");
    goToNextPending();
  }

  async function reject() {
    if (rejectReasons.length === 0) return toast.error("Sélectionnez au moins un motif de rejet.");
    setBusy(true);
    // L'API attend un champ `notes` libre — on y concatène les motifs sélectionnés + la note optionnelle.
    const notes = [rejectReasons.join(" · "), rejectNote.trim()].filter(Boolean).join(" — ");
    const { error } = await api.put(`/validation/${doc.id}`, { action: "REJECTED", notes });
    setBusy(false);
    if (error) return toast.error(error);
    toast.success("Document rejeté.");
    goToNextPending();
  }

  function toggleReason(r: string) {
    setRejectReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  // Stagiaire → soumet sa correction au N+1 (démo : pas d'endpoint de soumission stagiaire).
  async function submitForApproval() {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    setBusy(false);
    toast.success("Brouillon soumis pour approbation à votre N+1 (démo).");
    router.push("/app/dashboard");
  }

  // Ctrl/Cmd+Enter → approve (or edit-and-approve when fields changed).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canValidate && !busy && !rejecting) {
        e.preventDefault();
        submit(edited ? "EDITED" : "APPROVED");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canValidate, busy, rejecting, edited, amount, code, description]);

  const vatPct = Math.round((doc.vatRate ?? 0) * 10000) / 100;

  return (
    <div>
      {/* Tabs header — REDESIGN §1 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-px">
        {(
          [
            { id: "ocr", label: "OCR + Classification", icon: <FileText size={15} /> },
            { id: "fiscal", label: "Analyse fiscale", icon: <Scale size={15} /> },
            { id: "audit", label: "Audit trail", icon: <History size={15} /> },
          ] as { id: Tab; label: string; icon: ReactNode }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-slate-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — fixed: preview + confidence + category + assignment */}
        <div className="space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <ReceiptText size={16} /> Aperçu document
              </p>
              {imgFailed && <DemoBadge />}
            </div>
            {!imgFailed ? (
              <div className="overflow-hidden rounded-xl border border-border bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_BASE}/documents/${doc.id}/file`}
                  alt={`Reçu ${doc.vendor ?? ""}`}
                  onError={() => setImgFailed(true)}
                  className="mx-auto max-h-[24rem] w-auto"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-bg p-6">
                <div className="mx-auto max-w-xs rounded-lg bg-slate-100 p-5 font-mono text-xs text-slate-800 shadow-inner">
                  <p className="text-center text-sm font-bold uppercase">{doc.vendor}</p>
                  <p className="mt-1 text-center text-[10px] text-slate-500">{doc.client?.name}</p>
                  <div className="my-3 border-t border-dashed border-slate-300" />
                  <p>{doc.description}</p>
                  <div className="my-3 border-t border-dashed border-slate-300" />
                  <div className="flex justify-between">
                    <span>TVA ({vatPct}%)</span>
                    <span>{formatXAF(doc.vatAmount)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm font-bold">
                    <span>TOTAL</span>
                    <span>{formatXAF(doc.amount)}</span>
                  </div>
                  <p className="mt-3 text-center text-[10px] text-slate-500">{formatDate(doc.date)}</p>
                </div>
                <p className="mt-3 text-center text-xs text-muted">Image de reçu simulée (démo OCR)</p>
              </div>
            )}
          </div>

          {/* Confidence score bar */}
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Score confiance IA</span>
              <ConfidenceBadge value={doc.ocrConfidence} showLabel />
            </div>
            <ConfidenceBar value={doc.ocrConfidence} />
          </div>

          {/* Detected category — éditable (select complet 9 catégories) */}
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Catégorie détectée</span>
              <DemoBadge />
            </div>
            <CategorySelect value={categorie} onChange={setCategorie} disabled={!canEdit} />
          </div>

          {/* Assignment (démo) */}
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">Assigné à</span>
              <DemoBadge />
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-slate-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs">
                  <UserIcon size={14} />
                </span>
                Non assigné
              </span>
              <button type="button" className="text-xs text-primary hover:underline" disabled={!canValidate}>
                Modifier
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — tab content */}
        <div className="card">
          {tab === "ocr" && (
            <OcrTab
              doc={doc}
              accounts={accounts}
              canEdit={canEdit}
              vendor={vendor}
              setVendor={setVendor}
              amount={amount}
              setAmount={setAmount}
              dateStr={dateStr}
              setDateStr={setDateStr}
              vatAmount={vatAmount}
              setVatAmount={setVatAmount}
              description={description}
              setDescription={setDescription}
              code={code}
              setCode={setCode}
              creditCode={creditCode}
              setCreditCode={setCreditCode}
              tvaCode={tvaCode}
              labelFor={labelFor}
              search={search}
              setSearch={setSearch}
              groups={groups}
            />
          )}
          {tab === "fiscal" && <FiscalTab doc={doc} vatPct={vatPct} tvaCode={tvaCode} />}
          {tab === "audit" && <AuditTab doc={doc} />}
        </div>
      </div>

      {/* Footer actions */}
      {canValidate ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <button onClick={() => setRejecting(true)} disabled={busy} className="btn-danger">
            <X size={16} /> Rejeter
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted">
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd> +{" "}
              <kbd className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Entrée</kbd> pour approuver
            </span>
            <button onClick={() => submit("EDITED")} disabled={busy || !edited} className="btn-ghost">
              <Pencil size={16} /> Modifier et approuver
            </button>
            <button onClick={() => submit("APPROVED")} disabled={busy || edited} className="btn bg-emerald-600 text-white hover:bg-emerald-700">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approuver → QBO
            </button>
          </div>
        </div>
      ) : isTrainee ? (
        <div className="mt-6 space-y-3">
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-300">
            Mode brouillon : corrigez l&apos;OCR puis soumettez pour approbation. Un collaborateur (N+1) finalisera l&apos;enregistrement.
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <button onClick={() => setReporting(true)} disabled={busy} className="btn-ghost">
              <AlertOctagon size={16} /> Signaler un problème
            </button>
            <button onClick={submitForApproval} disabled={busy} className="btn-primary">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Soumettre pour approbation
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Lecture seule : vous n&apos;avez pas les droits pour valider ce document.
        </div>
      )}

      {/* Reject modal — REDESIGN §1 : chips motifs (min 1) + note optionnelle */}
      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setRejecting(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Rejeter le document</h3>
              <button onClick={() => setRejecting(false)} disabled={busy} className="text-muted hover:text-slate-200">
                <X size={18} />
              </button>
            </div>
            <p className="label">Motifs (au moins un)</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {REJECT_REASONS.map((r) => {
                const active = rejectReasons.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleReason(r)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-red-500 bg-red-500/15 text-red-300"
                        : "border-border bg-bg text-muted hover:text-slate-200"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            <label className="label">Note complémentaire (optionnel)</label>
            <textarea className="input" rows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setRejecting(false)} disabled={busy} className="btn-ghost">
                Annuler
              </button>
              <button onClick={reject} disabled={busy || rejectReasons.length === 0} className="btn-danger">
                {busy ? <Loader2 size={16} className="animate-spin" /> : "Confirmer le rejet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale « Signaler un problème » (stagiaire → N+1) */}
      {reporting && <ProblemModal onClose={() => setReporting(false)} />}
    </div>
  );
}

/* ───────────────── Problem report modal (trainee → supervisor) ───────────────── */
const PROBLEM_TYPES = [
  "Document illisible",
  "Informations contradictoires",
  "Compte SYSCOHADA incertain",
  "Autre",
];
function ProblemModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState(PROBLEM_TYPES[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function send() {
    if (!message.trim()) return toast.error("Décrivez le problème.");
    setBusy(true);
    // Démo : pas d'endpoint /api/messages. On simule l'envoi au N+1.
    setTimeout(() => {
      setBusy(false);
      toast.success("Problème signalé à votre N+1 (démo).");
      onClose();
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <AlertOctagon size={18} /> Signaler un problème
          </h3>
          <button onClick={onClose} className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Type de problème</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {PROBLEM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Décrivez le problème rencontré…" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={send} disabled={busy} className="btn-primary">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Confidence bar ───────────────── */
function ConfidenceBar({ value }: { value: number | null }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ───────────────── Category select — 9 catégories documentaires ───────────────── */
const CATEGORIES: { value: string; label: string }[] = [
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
function CategorySelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {CATEGORIES.map((c) => (
        <option key={c.value} value={c.value}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

/* ───────────────── Legal basis chip ───────────────── */
function LegalBasisChip({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-bg px-2 py-0.5 text-xs text-muted">
      <Scale size={11} /> {source}
    </span>
  );
}

/* ───────────────── SYSCOHADA account input with autocomplete ───────────────── */
function AccountInput({
  value,
  onChange,
  accounts,
  disabled,
  edited,
}: {
  value: string;
  onChange: (code: string) => void;
  accounts: SysohadaAccountDTO[];
  disabled?: boolean;
  edited?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = accounts.find((a) => a.code === value)?.label ?? "";

  // Suggestions on 2+ chars — REDESIGN §1 (autocomplétion plan comptable).
  const suggestions = useMemo(() => {
    if (value.length < 2) return [];
    return accounts.filter((a) => a.code.startsWith(value) && a.code !== value).slice(0, 6);
  }, [value, accounts]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <input
          className="input w-24 font-mono"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.replace(/[^0-9]/g, ""));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
        />
        <span className="truncate text-sm text-muted">{label || "—"}</span>
        {edited && <span className="demo-badge shrink-0">modifié</span>}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {suggestions.map((a) => (
            <button
              key={a.code}
              type="button"
              onClick={() => {
                onChange(a.code);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
            >
              <span className="font-mono text-slate-200">{a.code}</span>
              <span className="flex-1 truncate text-muted">{a.label}</span>
              <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted">Cl. {a.class}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Tab 1 : OCR + Classification ───────────────── */
function OcrTab({
  doc,
  accounts,
  canEdit,
  vendor,
  setVendor,
  amount,
  setAmount,
  dateStr,
  setDateStr,
  vatAmount,
  setVatAmount,
  description,
  setDescription,
  code,
  setCode,
  creditCode,
  setCreditCode,
  tvaCode,
  labelFor,
  search,
  setSearch,
  groups,
}: {
  doc: DocumentDTO;
  accounts: SysohadaAccountDTO[];
  canEdit: boolean;
  vendor: string;
  setVendor: (v: string) => void;
  amount: number;
  setAmount: (v: number) => void;
  dateStr: string;
  setDateStr: (v: string) => void;
  vatAmount: number;
  setVatAmount: (v: number) => void;
  description: string;
  setDescription: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  creditCode: string;
  setCreditCode: (v: string) => void;
  tvaCode: string | null;
  labelFor: (c: string) => string;
  search: string;
  setSearch: (v: string) => void;
  groups: [number, SysohadaAccountDTO[]][];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Données extraites par l&apos;IA</p>
      </div>

      {doc.needsReview && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>L&apos;IA n&apos;est pas certaine du compte SYSCOHADA. Veuillez vérifier avant de valider.</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="label">Fournisseur</label>
          <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant (XAF)</label>
            <input
              className="input font-mono"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Montant TVA (XAF)</label>
            <input
              className="input font-mono"
              type="number"
              value={vatAmount}
              onChange={(e) => setVatAmount(Number(e.target.value))}
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} />
          </div>
        </div>

        {/* Mapping SYSCOHADA éditable — 3 lignes (REDESIGN §1) */}
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="label mb-0">Mapping SYSCOHADA</span>
            <DemoBadge />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs font-semibold text-emerald-400">Débit</span>
              <AccountInput
                value={code}
                onChange={setCode}
                accounts={accounts}
                disabled={!canEdit}
                edited={code !== (doc.sysohadaCode ?? "")}
              />
            </div>
            {tvaCode && (
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-semibold text-blue-400">TVA</span>
                <div className="flex items-center gap-2">
                  <span className="input w-24 font-mono opacity-60">{tvaCode}</span>
                  <span className="text-sm text-muted">{labelFor(tvaCode) || "TVA récupérable"}</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs font-semibold text-red-400">Crédit</span>
              <AccountInput value={creditCode} onChange={setCreditCode} accounts={accounts} disabled={!canEdit} />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Contreparties (TVA / crédit fournisseur) simulées : la base ne stocke qu&apos;un compte par document.
          </p>
        </div>

        {/* Base légale */}
        <div className="flex flex-wrap gap-2">
          <LegalBasisChip source="SYSCOHADA révisé 2017" />
          {tvaCode && <LegalBasisChip source="CGI CM Art.149" />}
        </div>

        {/* SYSCOHADA searchable dropdown, grouped by class */}
        <div>
          <label className="label">Rechercher un compte (débit)</label>
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-bg px-3">
            <Search size={14} className="text-muted" />
            <input
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
              placeholder="Rechercher (ex. « carburant », « 626 »)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
            {groups.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted">Aucun compte trouvé.</p>}
            {groups.map(([cls, items]) => (
              <div key={cls}>
                <p className="sticky top-0 bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                  ── Classe {cls} — {CLASS_NAMES[cls] ?? ""} ──
                </p>
                {items.map((a) => (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => canEdit && setCode(a.code)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                      code === a.code ? "bg-primary/15" : ""
                    }`}
                    disabled={!canEdit}
                  >
                    <span className={`font-mono ${code === a.code ? "text-primary" : "text-slate-300"}`}>{a.code}</span>
                    <span className="truncate text-muted">{a.label}</span>
                    {code === a.code && <Check size={14} className="ml-auto shrink-0 text-primary" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Tab 2 : Analyse fiscale (démo, dérivée) ───────────────── */
function FiscalTab({ doc, vatPct, tvaCode }: { doc: DocumentDTO; vatPct: number; tvaCode: string | null }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Analyse fiscale</p>
        <DemoBadge />
      </div>

      {/* Obligations fiscales */}
      <div>
        <p className="label">Obligations fiscales identifiées</p>
        <div className="space-y-2">
          {doc.vatAmount && doc.vatAmount > 0 ? (
            <div className="rounded-lg border border-border bg-bg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200">TVA déductible ({vatPct}%)</span>
                <span className="font-mono text-sm text-emerald-400">{formatXAF(doc.vatAmount)}</span>
              </div>
              <div className="mt-1.5">
                <LegalBasisChip source="CGI CM Art.149 al.1 — taux normal 19,25%" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Aucune TVA récupérable sur ce document.</p>
          )}
        </div>
      </div>

      {/* Alertes échéances */}
      <div>
        <p className="label flex items-center gap-1.5">
          <CalendarClock size={13} /> Alertes échéances
        </p>
        {doc.vatAmount && doc.vatAmount > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-300">Déclaration TVA à déposer avant le 15 du mois suivant</p>
            <p className="mt-1 text-xs text-amber-300/80">
              TVA de la période concernée — pénalités de retard au-delà.
            </p>
            <div className="mt-1.5">
              <LegalBasisChip source="CGI CM Art.155" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Aucune échéance déclenchée par ce document.</p>
        )}
      </div>

      {/* Verdict conformité */}
      <div>
        <p className="label">Verdict de conformité</p>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <ShieldCheck size={16} /> CONFORME
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            <li>• Mentions légales présentes</li>
            <li>• Taux TVA correct ({vatPct}%)</li>
            <li>• Compte SYSCOHADA cohérent {tvaCode ? "(TVA séparée du compte de charge)" : ""}</li>
          </ul>
          <div className="mt-2">
            <LegalBasisChip source="CGI CM Art.239" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Tab 3 : Audit trail (démo, dérivé) ───────────────── */
function AuditTab({ doc }: { doc: DocumentDTO }) {
  const steps = [
    {
      actor: "Cerveau CLEVER (IA)",
      action: `OCR + classification — confiance ${Math.round((doc.ocrConfidence ?? 0) * 100)}%`,
      at: doc.createdAt,
      done: true,
    },
    doc.needsReview
      ? { actor: "Stagiaire", action: "Brouillon corrigé", at: doc.createdAt, done: true }
      : null,
    doc.validation
      ? {
          actor: doc.validation.validatedBy?.name ?? "Collaborateur",
          action:
            doc.validation.action === "REJECTED"
              ? `Document rejeté${doc.validation.notes ? ` — ${doc.validation.notes}` : ""}`
              : "Document approuvé → QuickBooks",
          at: doc.createdAt,
          done: true,
        }
      : { actor: "Collaborateur", action: "En attente de validation", at: null, done: false },
  ].filter(Boolean) as { actor: string; action: string; at: string | null; done: boolean }[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Piste d&apos;audit</p>
        <DemoBadge />
      </div>
      <ol className="relative ml-2 space-y-5 border-l border-border pl-5">
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span
              className={`absolute -left-[1.55rem] mt-0.5 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-surface ${
                s.done ? "bg-primary" : "bg-surface-2"
              }`}
            />
            <p className="text-sm font-medium text-slate-200">{s.actor}</p>
            <p className="text-xs text-muted">{s.action}</p>
            {s.at && <p className="mt-0.5 text-[11px] text-muted">{formatDate(s.at)}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
