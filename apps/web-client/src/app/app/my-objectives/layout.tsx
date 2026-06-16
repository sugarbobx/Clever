import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes objectifs",
  description: "Vos objectifs assignés (journaliers à annuels) avec suivi des sous-objectifs et de la progression.",
};

export default function MyObjectivesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
