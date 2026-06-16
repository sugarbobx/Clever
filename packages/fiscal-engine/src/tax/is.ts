/**
 * IS — Impôt sur les Sociétés (corporate income tax), simplified.
 * Flat statutory rate per country with a minimum levy (IMF — impôt minimum
 * forfaitaire) floor on turnover. Indicative MVP figures.
 */

export interface CorporateTaxConfig {
  /** Statutory IS rate on taxable profit */
  rate: number;
  /** Minimum levy rate applied to turnover (floor) */
  minLevyRate: number;
}

export const IS_CONFIG: Record<string, CorporateTaxConfig> = {
  CM: { rate: 0.33, minLevyRate: 0.02 }, // Cameroun (IS 33% incl. surtax, IMF ~2%)
  CI: { rate: 0.25, minLevyRate: 0.005 },
  SN: { rate: 0.3, minLevyRate: 0.005 },
  GA: { rate: 0.3, minLevyRate: 0.01 },
};

const DEFAULT = "CM";

export interface IsResult {
  taxableProfit: number;
  turnover: number;
  statutoryTax: number;
  minimumLevy: number;
  taxDue: number;
  appliedRule: "statutory" | "minimum";
}

export function computeIS(taxableProfit: number, turnover: number, country = DEFAULT): IsResult {
  const cfg = IS_CONFIG[country] ?? IS_CONFIG[DEFAULT];
  const profit = Math.max(0, taxableProfit);
  const statutoryTax = round2(profit * cfg.rate);
  const minimumLevy = round2(Math.max(0, turnover) * cfg.minLevyRate);
  const taxDue = Math.max(statutoryTax, minimumLevy);
  return {
    taxableProfit: profit,
    turnover: Math.max(0, turnover),
    statutoryTax,
    minimumLevy,
    taxDue,
    appliedRule: taxDue === statutoryTax ? "statutory" : "minimum",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
