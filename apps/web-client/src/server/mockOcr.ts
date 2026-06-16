/**
 * MOCK OCR — local MVP stand-in for the Claude receipt-extraction step.
 * Returns structured fields shaped exactly like the real pipeline's output,
 * deriving the SYSCOHADA code from @clever/fiscal-engine so the mapping is real
 * even though the "reading" of the image is faked.
 *
 * Server-backed phase: replace `extract()` with a call to services/claude.ts.
 */
import { matchDescription, tvaFromTTC, tvaRate } from "@clever/fiscal-engine";

export interface OcrExtraction {
  vendor: string;
  amount: number;
  currency: string;
  date: string; // ISO date
  vatAmount: number | null;
  vatRate: number | null;
  description: string;
  sysohadaCode: string;
  sysohadaLabel: string;
  confidence: number;
  needsReview: boolean;
}

/** A small library of believable Cameroonian receipts for demos. */
const SAMPLES: Array<{ vendor: string; description: string; amount: number }> = [
  { vendor: "Total Energies Bonanjo", description: "essence station total carburant", amount: 25000 },
  { vendor: "Orange Cameroun", description: "facture orange internet forfait", amount: 15000 },
  { vendor: "Restaurant Le Foufou", description: "repas client restaurant déjeuner", amount: 32000 },
  { vendor: "Papeterie Centrale", description: "achat papier stylos fournitures de bureau", amount: 18500 },
  { vendor: "CongelCam Akwa", description: "clavier souris cable usb informatique", amount: 47000 },
  { vendor: "Hôtel Akwa Palace", description: "hôtel déplacement mission Douala", amount: 85000 },
  { vendor: "Express Union", description: "frais bancaires commission virement", amount: 3500 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function extract(input?: { vendor?: string; description?: string; amount?: number; country?: string }): OcrExtraction {
  const base = input?.description ? input : pick(SAMPLES);
  const country = input?.country ?? "CM";
  const description = base.description ?? "dépense diverse";
  const vendor = base.vendor ?? "Fournisseur";
  const amount = base.amount ?? 10000;
  const match = matchDescription(description);
  const rate = tvaRate(country);

  return {
    vendor,
    amount,
    currency: "XAF",
    date: new Date().toISOString().slice(0, 10),
    vatAmount: tvaFromTTC(amount, country),
    vatRate: rate,
    description,
    sysohadaCode: match.code,
    sysohadaLabel: match.label,
    confidence: match.confidence,
    needsReview: match.needsReview,
  };
}
