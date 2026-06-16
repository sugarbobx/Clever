import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes documents",
  description: "Téléversez vos reçus et factures et suivez leur validation par le cabinet.",
};

export default function ClientDocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
