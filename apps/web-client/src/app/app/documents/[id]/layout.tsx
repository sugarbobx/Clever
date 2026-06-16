import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Validation du document",
  description: "Vérifiez l'OCR, le mapping SYSCOHADA et l'analyse fiscale avant de valider vers QuickBooks.",
};

export default function DocumentDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
