import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiscalité",
  description: "Simulateur fiscal CLEVER : IRPP, TVA et impôt sur les sociétés selon le barème en vigueur (CM, CI, GA).",
};

export default function TaxLayout({ children }: { children: React.ReactNode }) {
  return children;
}
