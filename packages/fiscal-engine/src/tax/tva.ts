/** TVA (VAT) rates and helpers for the OHADA zone. */

export const TVA_RATES: Record<string, number> = {
  CM: 0.1925, // Cameroun
  CI: 0.18, // Côte d'Ivoire
  SN: 0.18, // Sénégal
  GA: 0.18, // Gabon
  CG: 0.18, // Congo
  TG: 0.18, // Togo
  BJ: 0.18, // Bénin
  ML: 0.18, // Mali
  BF: 0.18, // Burkina Faso
  GN: 0.18, // Guinée
};

export const DEFAULT_COUNTRY = "CM";

export function tvaRate(country: string = DEFAULT_COUNTRY): number {
  return TVA_RATES[country] ?? TVA_RATES[DEFAULT_COUNTRY];
}

/** Extract the TVA portion from a TTC (tax-inclusive) amount. */
export function tvaFromTTC(amountTTC: number, country = DEFAULT_COUNTRY): number {
  const rate = tvaRate(country);
  return round2((amountTTC * rate) / (1 + rate));
}

/** Add TVA onto an HT (tax-exclusive) amount → TTC. */
export function ttcFromHT(amountHT: number, country = DEFAULT_COUNTRY): number {
  return round2(amountHT * (1 + tvaRate(country)));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
