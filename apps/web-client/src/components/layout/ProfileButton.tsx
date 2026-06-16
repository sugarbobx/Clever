"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, User as UserIcon, Settings, LogOut, X, Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/stores/auth.store";
import { ROLE_LABELS } from "@/lib/types";
import { DemoBadge } from "@/components/ui/Misc";

const AVATAR_COLORS = ["bg-primary", "bg-emerald-600", "bg-amber-600", "bg-rose-600", "bg-violet-600", "bg-cyan-600"];

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Universal profile button — avatar + name + dropdown (profil / paramètres / déconnexion). */
export function ProfileButton() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modalTab, setModalTab] = useState<null | "profil" | "params">(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const storageKey = user ? `clever:avatar:${user.id}` : null;

  // Photo persistée localement (démo — pas d'envoi serveur).
  useEffect(() => {
    if (storageKey) setPhoto(localStorage.getItem(storageKey));
  }, [storageKey]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) return null;
  const color = AVATAR_COLORS[user.name.charCodeAt(0) % AVATAR_COLORS.length];

  const Avatar = ({ size = 28 }: { size?: number }) =>
    photo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photo} alt={user.name} className="rounded-full object-cover" style={{ width: size, height: size }} />
    ) : (
      <span
        className={`flex items-center justify-center rounded-full font-bold text-white ${color}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initialsOf(user.name)}
      </span>
    );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm hover:bg-surface-2"
      >
        <Avatar />
        <span className="hidden font-medium text-slate-100 sm:block">{user.name}</span>
        <ChevronDown size={15} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
            <Avatar size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-100">{user.name}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setModalTab("profil");
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-surface-2"
          >
            <UserIcon size={15} /> Mon profil
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setModalTab("params");
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-surface-2"
          >
            <Settings size={15} /> Paramètres du compte
          </button>
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="flex w-full items-center gap-2.5 border-t border-border px-3 py-2 text-left text-sm text-red-400 hover:bg-surface-2"
          >
            <LogOut size={15} /> Se déconnecter
          </button>
        </div>
      )}

      {modalTab && (
        <ProfileModal
          initialTab={modalTab}
          name={user.name}
          email={user.email}
          photo={photo}
          onClose={() => setModalTab(null)}
          onSave={(newPhoto) => {
            if (storageKey) {
              if (newPhoto) localStorage.setItem(storageKey, newPhoto);
              setPhoto(newPhoto);
            }
            setModalTab(null);
            toast.success("Profil mis à jour (démo — non persisté côté serveur).");
          }}
        />
      )}
    </div>
  );
}

function ProfileModal({
  initialTab,
  name,
  email,
  photo,
  onClose,
  onSave,
}: {
  initialTab: "profil" | "params";
  name: string;
  email: string;
  photo: string | null;
  onClose: () => void;
  onSave: (photo: string | null) => void;
}) {
  const [tab, setTab] = useState<"profil" | "params">(initialTab);
  const [preview, setPreview] = useState<string | null>(photo);
  const [n, setN] = useState(name);
  const [m, setM] = useState(email);
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [prefs, setPrefs] = useState({ emailNotif: true, pushNotif: false, weekly: true });
  const [lang, setLang] = useState("fr");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string); // preview local avant envoi
    reader.readAsDataURL(file);
  }

  function save() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onSave(preview);
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{tab === "profil" ? "Mon profil" : "Paramètres du compte"}</h3>
          <button onClick={onClose} aria-label="Fermer" className="text-muted hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 inline-flex rounded-lg border border-border bg-bg p-0.5">
          <button
            onClick={() => setTab("profil")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${tab === "profil" ? "bg-primary text-white" : "text-muted hover:text-slate-200"}`}
          >
            Profil
          </button>
          <button
            onClick={() => setTab("params")}
            className={`rounded-md px-3 py-1 text-sm font-medium ${tab === "params" ? "bg-primary text-white" : "text-muted hover:text-slate-200"}`}
          >
            Paramètres
          </button>
        </div>

        {tab === "profil" ? (
          <>
            <div className="mb-4 flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Changer la photo de profil"
                className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2"
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Aperçu" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-muted">{initialsOf(n)}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera size={18} className="text-white" />
                </span>
              </button>
              <div className="text-sm">
                <button onClick={() => fileRef.current?.click()} className="font-medium text-primary hover:underline">
                  Changer la photo
                </button>
                <p className="text-xs text-muted">JPG ou PNG. Aperçu local. <DemoBadge /></p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">Nom</label>
                <input className="input" value={n} onChange={(e) => setN(e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={m} onChange={(e) => setM(e.target.value)} />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input className="input font-mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237690000000" />
              </div>
              <div>
                <label className="label">Nouveau mot de passe</label>
                <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="mb-1 flex justify-end">
              <DemoBadge />
            </div>
            <PrefToggle label="Notifications par email" value={prefs.emailNotif} onChange={(v) => setPrefs((p) => ({ ...p, emailNotif: v }))} />
            <PrefToggle label="Notifications push" value={prefs.pushNotif} onChange={(v) => setPrefs((p) => ({ ...p, pushNotif: v }))} />
            <PrefToggle label="Résumé hebdomadaire" value={prefs.weekly} onChange={(v) => setPrefs((p) => ({ ...p, weekly: v }))} />
            <div className="pt-2">
              <label className="label">Langue</label>
              <select className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">Annuler</button>
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? <Loader2 size={16} className="animate-spin" /> : null} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function PrefToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-bg px-3 py-2 text-left text-sm text-slate-200"
    >
      {label}
      <span className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-surface-2"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-[1.15rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
