"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  FileText,
  Target,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  CalendarClock,
  Inbox,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

type Tone = "info" | "warn" | "success" | "danger";
interface Notif {
  id: string;
  icon: ReactNode;
  title: string;
  detail?: string;
  time: string;
  read: boolean;
  href?: string;
  tone: Tone;
}

const TONE_CLS: Record<Tone, string> = {
  info: "text-blue-400",
  warn: "text-amber-400",
  success: "text-emerald-400",
  danger: "text-red-400",
};

const STAFF_SEED: Notif[] = [
  { id: "s-obj", icon: <Target size={15} />, title: "Nouvel objectif assigné", detail: "Déclaration TVA mensuelle — échéance le 15.", time: "il y a 1 h", read: false, href: "/app/my-objectives", tone: "info" },
  { id: "s-qbo", icon: <AlertTriangle size={15} />, title: "Erreur QuickBooks", detail: "Un document n'a pas pu être poussé vers QBO.", time: "il y a 3 h", read: false, href: "/app/documents", tone: "danger" },
  { id: "s-msg", icon: <MessageSquare size={15} />, title: "Nouveau message client", detail: "SARL TechConsult CM vous a écrit.", time: "hier", read: true, href: "/app/clients", tone: "info" },
];

const CLIENT_SEED: Notif[] = [
  { id: "c-val", icon: <CheckCircle2 size={15} />, title: "Document validé", detail: "Votre reçu Total Énergies a été enregistré.", time: "il y a 2 h", read: false, href: "/client/documents", tone: "success" },
  { id: "c-tva", icon: <CalendarClock size={15} />, title: "Échéance fiscale proche", detail: "Déclaration TVA à déposer dans 12 jours.", time: "il y a 5 h", read: false, href: "/client/tax", tone: "warn" },
  { id: "c-msg", icon: <MessageSquare size={15} />, title: "Message de votre comptable", detail: "TCCS : « Pensez à m'envoyer le relevé. »", time: "hier", read: true, href: "/client/chat", tone: "info" },
];

/** Universal notification center — replaces the old queue counter. */
export function NotificationCenter({ area }: { area: "staff" | "client" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(area === "staff" ? STAFF_SEED : CLIENT_SEED);
  const [pending, setPending] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Live queue count (staff) via SSE → notification dynamique.
  useEffect(() => {
    if (area !== "staff") return;
    const es = new EventSource(`${API_BASE}/dashboard/queue`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const { pendingCount } = JSON.parse(e.data);
        setPending(pendingCount);
      } catch {
        /* keep-alive ping */
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [area]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Notification "file de validation" en tête (staff) reflétant le compteur live.
  const queueNotif: Notif | null = useMemo(
    () =>
      area === "staff"
        ? {
            id: "queue",
            icon: <Inbox size={15} />,
            title: "File de validation",
            detail: pending > 0 ? `${pending} document(s) en attente.` : "Aucun document en attente.",
            time: "en direct",
            read: pending === 0,
            href: "/app/queue",
            tone: pending > 0 ? "warn" : "info",
          }
        : null,
    [area, pending]
  );

  const all = useMemo(() => (queueNotif ? [queueNotif, ...notifs] : notifs), [queueNotif, notifs]);
  const unread = all.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setPending(0);
  }

  function onClick(n: Notif) {
    if (n.id !== "queue") setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setOpen(false);
    if (n.href) router.push(n.href);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        className="relative flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 hover:bg-surface-2"
      >
        <Bell size={16} className={unread ? "text-amber-400" : "text-muted"} />
        <span className="hidden text-sm text-slate-300 sm:block">Notifications</span>
        {unread > 0 && (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs font-bold text-amber-400">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-slate-100">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Check size={12} /> Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {all.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">Aucune notification.</p>
            ) : (
              all.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onClick(n)}
                  className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-surface-2 ${n.read ? "" : "bg-primary/5"}`}
                >
                  <span className={`mt-0.5 shrink-0 ${TONE_CLS[n.tone]}`}>{n.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-100">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />}
                    </span>
                    {n.detail && <span className="block truncate text-xs text-muted">{n.detail}</span>}
                    <span className="block text-[10px] text-muted">{n.time}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setOpen(false);
              router.push(area === "staff" ? "/app/dashboard" : "/client/dashboard");
            }}
            className="flex w-full items-center justify-center gap-1 border-t border-border px-3 py-2 text-xs text-primary hover:bg-surface-2"
          >
            <FileText size={12} /> Voir le tableau de bord
          </button>
        </div>
      )}
    </div>
  );
}
