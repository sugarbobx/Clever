import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord",
  description: "Activité du cabinet : portefeuille clients, file de validation, équipe et objectifs selon votre rôle.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
