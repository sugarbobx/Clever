import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouveau client",
  description: "Onboarding guidé d'un nouveau client en 4 étapes : profil, situation, objectifs et activation.",
};

export default function NewClientLayout({ children }: { children: React.ReactNode }) {
  return children;
}
