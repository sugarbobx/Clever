"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { ClientAccountDTO } from "@/lib/types";
import { useAuth } from "@/stores/auth.store";
import { TierBadge } from "@/components/subscription/Tier";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/Misc";

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientAccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<{ clients: ClientAccountDTO[] }>("/clients");
    if (error) setError(error);
    else setClients(data!.clients);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Clients</h1>
          <p className="text-sm text-muted">Portefeuille clients du cabinet.</p>
        </div>
        {user?.role === "MANAGER_N2" && (
          <Link href="/app/clients/new" className="btn-primary">
            <Plus size={16} /> Nouveau client
          </Link>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <Skeleton className="h-64" />
      ) : clients.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="Aucun client" desc="Ajoutez votre premier client pour commencer." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Nom</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Forfait</th>
                <th className="px-4 py-3 font-semibold">Documents</th>
                <th className="px-4 py-3 font-semibold">QuickBooks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((c) => (
                <tr key={c.id} className="bg-surface/40 hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/app/clients/${c.id}`} className="font-medium text-slate-100 hover:text-primary">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.type === "COMPANY" ? "Entreprise" : "Particulier"}</td>
                  <td className="px-4 py-3">
                    <TierBadge tier={c.subscriptionTier} />
                  </td>
                  <td className="px-4 py-3 text-muted">{c._count?.documents ?? 0}</td>
                  <td className="px-4 py-3">
                    {c.qboConnection?.isActive ? (
                      <span className="text-xs font-semibold text-emerald-400">Connecté (démo)</span>
                    ) : (
                      <span className="text-xs text-muted">Non connecté</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
