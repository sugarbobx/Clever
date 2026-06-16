import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Objectifs",
  description: "Création, assignation et suivi des objectifs de l'équipe comptable (journaliers à annuels).",
};

export default function ObjectivesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
