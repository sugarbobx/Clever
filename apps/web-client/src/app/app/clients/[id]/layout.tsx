import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiche client",
  description: "Abonnement, documents, connexion QuickBooks et messagerie d'un client du cabinet.",
};

export default function ClientDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
