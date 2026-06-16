import { describe, it, expect } from "vitest";
import { matchDescription } from "../syscohada/matcher";
import { computeIRPP } from "../tax/irpp";
import { computeIS } from "../tax/is";
import { tvaFromTTC } from "../tax/tva";
import { isValidSysohadaCode } from "../syscohada/validator";

describe("SYSCOHADA matcher", () => {
  it("maps fuel/station to a travel account (625x)", () => {
    const r = matchDescription("essence station total");
    expect(r.code).toMatch(/^625/);
    expect(r.confidence).toBeGreaterThan(0);
  });

  it("maps telecom invoices to 626", () => {
    const r = matchDescription("facture orange telecom");
    expect(r.code).toBe("626");
  });

  it("maps restaurant meals to 6253", () => {
    const r = matchDescription("repas client restaurant");
    expect(r.code).toBe("6253");
  });

  it("maps office supplies to a bureau account", () => {
    const r = matchDescription("achat papier et stylo de bureau");
    expect(["6043", "6064"]).toContain(r.code);
  });

  it("maps IT supplies to 6065", () => {
    const r = matchDescription("clavier souris et cable usb");
    expect(r.code).toBe("6065");
  });

  it("handles misspelled / accented input via normalisation", () => {
    const r = matchDescription("HÔTEL et déplacement mission");
    expect(r.code).toMatch(/^625/);
  });

  it("falls back to 6043 + needsReview when nothing matches", () => {
    const r = matchDescription("xyzzy qwerty zzz");
    expect(r.code).toBe("6043");
    expect(r.needsReview).toBe(true);
  });
});

describe("validator", () => {
  it("accepts known codes and rejects unknown", () => {
    expect(isValidSysohadaCode("6253")).toBe(true);
    expect(isValidSysohadaCode("9999")).toBe(false);
  });
});

describe("tax", () => {
  it("extracts Cameroon TVA from a TTC amount", () => {
    // 119250 TTC @ 19.25% → ~19250 TVA
    expect(tvaFromTTC(119250, "CM")).toBeCloseTo(19250, 0);
  });

  it("computes progressive IRPP", () => {
    const r = computeIRPP(4_000_000);
    expect(r.totalTax).toBeGreaterThan(0);
    expect(r.effectiveRate).toBeGreaterThan(0.1);
    expect(r.effectiveRate).toBeLessThan(0.35);
  });

  it("applies IS minimum levy when profit is low but turnover high", () => {
    const r = computeIS(0, 100_000_000, "CM");
    expect(r.appliedRule).toBe("minimum");
    expect(r.taxDue).toBeGreaterThan(0);
  });
});
