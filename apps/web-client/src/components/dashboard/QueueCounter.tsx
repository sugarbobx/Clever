"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { API_BASE } from "@/lib/api";

/** Live count of documents awaiting validation, via SSE. */
export function QueueCounter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/dashboard/queue`, { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const { pendingCount } = JSON.parse(e.data);
        setCount((prev) => {
          if (pendingCount !== prev) {
            setPulse(true);
            setTimeout(() => setPulse(false), 800);
          }
          return pendingCount;
        });
      } catch {
        /* ignore keep-alive pings */
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
      <Bell size={16} className={pulse ? "text-amber-400" : "text-muted"} />
      <span className="text-sm text-slate-300">File d&apos;attente</span>
      <span
        className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold transition-colors ${
          count > 0 ? "bg-amber-500/20 text-amber-400" : "bg-surface-2 text-muted"
        } ${pulse ? "scale-110" : ""}`}
      >
        {count}
      </span>
    </div>
  );
}
