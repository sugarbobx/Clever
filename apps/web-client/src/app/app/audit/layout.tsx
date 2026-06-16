import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal d'audit",
  description: "Piste d'audit immuable des actions de validation et de gestion du cabinet.",
};

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
