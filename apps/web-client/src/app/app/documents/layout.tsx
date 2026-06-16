import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documents",
  description: "Tous les documents traités par le cabinet, avec statut et score de confiance de l'IA.",
};

export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
