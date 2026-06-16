/**
 * IRPP — Impôt sur le Revenu des Personnes Physiques (personal income tax).
 * Simplified progressive brackets for Cameroon (annual, XAF). Indicative only —
 * for the MVP tax simulator, not a certified fiscal calculation.
 */

export interface TaxBracket {
  /** Inclusive lower bound (XAF, annual net taxable income) */
  from: number;
  /** Exclusive upper bound, or null for the top bracket */
  to: number | null;
  /** Marginal rate */
  rate: number;
}

/** Cameroon IRPP barème (simplified, indicative). */
export const IRPP_BRACKETS_CM: TaxBracket[] = [
  { from: 0, to: 2_000_000, rate: 0.1 },
  { from: 2_000_000, to: 3_000_000, rate: 0.15 },
  { from: 3_000_000, to: 5_000_000, rate: 0.25 },
  { from: 5_000_000, to: null, rate: 0.35 },
];

export interface IrppResult {
  taxableIncome: number;
  totalTax: number;
  effectiveRate: number;
  breakdown: { bracket: string; rate: number; taxedAmount: number; tax: number }[];
}

export function computeIRPP(taxableIncome: number, brackets = IRPP_BRACKETS_CM): IrppResult {
  const income = Math.max(0, taxableIncome);
  let totalTax = 0;
  const breakdown: IrppResult["breakdown"] = [];

  for (const b of brackets) {
    if (income <= b.from) break;
    const upper = b.to ?? income;
    const taxedAmount = Math.max(0, Math.min(income, upper) - b.from);
    if (taxedAmount <= 0) continue;
    const tax = taxedAmount * b.rate;
    totalTax += tax;
    breakdown.push({
      bracket: b.to ? `${b.from.toLocaleString("fr-FR")}–${b.to.toLocaleString("fr-FR")}` : `> ${b.from.toLocaleString("fr-FR")}`,
      rate: b.rate,
      taxedAmount: round2(taxedAmount),
      tax: round2(tax),
    });
  }

  return {
    taxableIncome: income,
    totalTax: round2(totalTax),
    effectiveRate: income > 0 ? Number((totalTax / income).toFixed(4)) : 0,
    breakdown,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
