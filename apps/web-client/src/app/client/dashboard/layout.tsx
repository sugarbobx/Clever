import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon espace",
  description: "Votre espace CLEVER : documents récents, conformité OHADA et accompagnement par votre comptable TCCS.",
};

export default function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
