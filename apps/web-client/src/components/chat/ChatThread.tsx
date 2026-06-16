"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth.store";
import { STAFF_ROLES } from "@/lib/types";
import { Skeleton, ErrorState } from "@/components/ui/Misc";

interface ChatMsg {
  id: string;
  fromStaff: boolean;
  content: string;
  createdAt: string;
}

/**
 * Secure client ↔ assigned-staff thread (Module 9). DB-backed, polled every
 * 10s. Pass `clientId` when viewing as staff; omit it for the client's own
 * thread. "Mine" bubbles are decided by whether the viewer is staff.
 */
export function ChatThread({ clientId, heightClass = "h-[60vh]" }: { clientId?: string; heightClass?: string }) {
  const { user } = useAuth();
  const isStaffViewer = user ? STAFF_ROLES.includes(user.role) : false;
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const { data, error } = await api.get<{ messages: ChatMsg[] }>(`/chat${query}`);
      if (error) {
        if (!silent) setError(error);
      } else if (data) {
        setError(null);
        setMsgs(data.messages);
      }
      if (!silent) setLoading(false);
    },
    [query]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Poll every 10 seconds (MVP: no WebSocket).
  useEffect(() => {
    const t = setInterval(() => load(true), 10_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    const { error } = await api.post("/chat", { content, ...(clientId ? { clientId } : {}) });
    setSending(false);
    if (error) return toast.error(error);
    setText("");
    load(true);
  }

  if (error) return <ErrorState message={error} onRetry={() => load()} />;
  if (loading) return <Skeleton className={heightClass} />;

  return (
    <div className={`flex flex-col rounded-xl border border-border bg-surface/40 ${heightClass}`}>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">
            Aucun message pour l&apos;instant. Démarrez la conversation ci-dessous.
          </p>
        ) : (
          msgs.map((m) => {
            const mine = m.fromStaff === isStaffViewer;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-primary text-white" : "bg-surface-2 text-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        <input
          className="input"
          placeholder="Votre message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-primary !px-3" type="submit" disabled={sending}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
