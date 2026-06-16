"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Link2, Loader2, Mail, Phone, MapPin, RefreshCw, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ClientAccountDTO, DocumentDTO } from "@/lib/types";
import { useAuth } from "@/stores/auth.store";
import { TierBadge, TIER_LABELS } from "@/components/subscription/Tier";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { ChatThread } from "@/components/chat/ChatThread";
import { ClientInsights } from "@/components/clients/ClientInsights";
import { Skeleton, ErrorState, DemoBadge } from "@/components/ui/Misc";

interface ClientDetail extends Omit<ClientAccountDTO, "qboConnection"> {
  documents: DocumentDTO[];
  qboConnection?: {
    isActive: boolean;
    demo: boolean;
    realmId: string;
    environment?: string;
    tokenExpiry?: string;
    updatedAt?: string;
  } | null;
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await api.get<{ client: ClientDetail }>(`/clients/${id}`);
    if (error) setError(error);
    else setClient(data!.client);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // OAuth callback feedback (?qbo=connected|error) — read once on the client.
  useEffect(() => {
    const qbo = new URLSearchParams(window.location.search).get("qbo");
    if (qbo === "connected") toast.success("QuickBooks connecté avec succès !");
    if (qbo === "error") toast.error("Échec de la connexion QuickBooks.");
  }, []);

  async function connectQbo() {
    setConnecting(true);
    const { data, error } = await api.post<{ authUrl?: string }>("/integrations/quickbooks/connect", { clientId: id });
    if (error) {
      setConnecting(false);
      return toast.error(error);
    }
    // Real OAuth: redirect the browser to Intuit. Mock: just reload.
    if (data?.authUrl) {
      window.location.href = data.authUrl;
      return;
    }
    setConnecting(false);
    toast.success("QuickBooks connecté (démo).");
    load();
  }

  async function testQbo() {
    setTesting(true);
    const { data, error } = await api.get<{ companyName: string }>(`/integrations/quickbooks/test/${id}`);
    setTesting(false);
    if (error) return toast.error(error);
    toast.success(`Connexion OK — ${data!.companyName}`);
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (loading || !client)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );

  return (
    <div>
      <Link href="/app/clients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft size={15} /> Retour aux clients
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{client.name}</h1>
          <p className="text-sm text-muted">{client.type === "COMPANY" ? "Entreprise" : "Particulier"}</p>
        </div>
        <TierBadge tier={client.subscriptionTier} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="mb-3 text-sm font-semibold text-slate-200">Coordonnées</p>
          <p className="flex items-center gap-2 text-sm text-slate-300"><Mail size={14} className="text-muted" /> {client.email}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><Phone size={14} className="text-muted" /> {client.phone ?? "—"}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><MapPin size={14} className="text-muted" /> {client.country}</p>
        </div>

        <div className="card">
          <p className="mb-3 text-sm font-semibold text-slate-200">Forfait & usage</p>
          <p className="text-sm text-slate-300">{TIER_LABELS[client.subscriptionTier]}</p>
          <p className="mt-2 text-sm text-muted">{client.documentCount} document(s) ce mois</p>
          <p className="mt-2 text-sm text-muted">Comptable : {client.assignedStaff?.name ?? "—"}</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-200">QuickBooks</p>
            {(!client.qboConnection || client.qboConnection.demo) && <DemoBadge />}
          </div>
          {client.qboConnection?.isActive ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <CheckCircle2 size={15} /> Connecté
              </p>
              <div className="space-y-1 text-xs text-muted">
                <p>
                  Realm : <span className="font-mono text-slate-300">{client.qboConnection.realmId}</span>
                </p>
                <p>Environnement : {client.qboConnection.environment === "production" ? "🟢 Production" : "🟡 Sandbox"}</p>
                {client.qboConnection.tokenExpiry && (
                  <p>
                    Token expire : dans{" "}
                    {Math.max(0, Math.round((new Date(client.qboConnection.tokenExpiry).getTime() - Date.now()) / 60000))} min
                  </p>
                )}
              </div>
              {user?.role === "MANAGER_N2" && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={testQbo} disabled={testing} className="btn-ghost !py-1.5 text-xs">
                    <RefreshCw size={13} className={testing ? "animate-spin" : ""} /> Tester
                  </button>
                  <button onClick={connectQbo} disabled={connecting} className="btn-ghost !py-1.5 text-xs">
                    <Link2 size={13} /> Reconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">Aucune connexion active.</p>
              {user?.role === "MANAGER_N2" && (
                <button onClick={connectQbo} disabled={connecting} className="btn-primary w-full">
                  {connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />} Connecter QuickBooks
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-white">Documents récents</h2>
      {client.documents.length === 0 ? (
        <p className="text-sm text-muted">Aucun document.</p>
      ) : (
        <DocumentTable docs={client.documents} />
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold text-white">Messagerie</h2>
      <p className="mb-3 text-sm text-muted">Échangez avec {client.name} — visible dans son portail.</p>
      <ChatThread clientId={id} heightClass="h-96" />

      {/* Sections additionnelles : situation comptable/fiscale, échéances, objectifs */}
      <ClientInsights clientId={id} clientName={client.name} />
    </div>
  );
}
