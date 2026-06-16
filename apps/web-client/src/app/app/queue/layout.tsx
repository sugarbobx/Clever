import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "File de validation",
  description: "Documents en attente de revue comptable, avec approbation en lot et assignation aux stagiaires.",
};

export default function QueueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
