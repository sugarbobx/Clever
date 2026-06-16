import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messagerie",
  description: "Messagerie sécurisée avec votre comptable assigné chez THECLEVEREST Consulting.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
