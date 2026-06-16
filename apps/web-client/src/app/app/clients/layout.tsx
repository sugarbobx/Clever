import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients",
  description: "Portefeuille des clients du cabinet, forfaits et connexion QuickBooks.",
};

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
