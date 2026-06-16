import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace CLEVER — manager, comptable, stagiaire ou client.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
