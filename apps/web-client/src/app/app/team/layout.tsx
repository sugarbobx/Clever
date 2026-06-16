import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Équipe",
  description: "Membres du cabinet, rôles et permissions déléguées.",
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
