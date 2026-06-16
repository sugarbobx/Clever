import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bienvenue — Configuration de votre espace",
  description: "Configurez votre espace CLEVER en quelques étapes.",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
