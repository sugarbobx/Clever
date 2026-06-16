import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Créez votre compte CLEVER : particulier, entreprise, collaborateur ou stagiaire.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
