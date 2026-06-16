import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comptabilité",
  description: "Votre comptabilité SYSCOHADA : revenus, charges, trésorerie et état des documents.",
};

export default function ComptabiliteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
