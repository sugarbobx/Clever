/**
 * Fuzzy matcher: a free-text French receipt description → best SYSCOHADA code.
 * Pure, dependency-free. Keyword-weighted scoring with accent/diacritic
 * normalisation. When confidence is low, falls back to the generic Class 6
 * "Achats de fournitures de bureau" (6043) and flags needs_review.
 */

import { SYSCOHADA_LIST, type SysohadaCode } from "./accounts";

export interface MatchResult {
  code: SysohadaCode | string;
  label: string;
  /** 0..1 confidence in the assignment */
  confidence: number;
  /** true when confidence < 0.7 — staff must finalise the sub-account */
  needsReview: boolean;
}

const FALLBACK_CODE = "6043";
const CONFIDENCE_THRESHOLD = 0.7;

/** Lower-case, strip accents, collapse non-alphanumerics to spaces. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/**
 * Score one account against the description tokens.
 * Each matched keyword contributes; multi-word keywords that appear as a
 * phrase score higher. Score is normalised against the number of keywords.
 */
function scoreAccount(descNorm: string, tokens: Set<string>, keywords: string[]): number {
  if (!keywords.length) return 0;
  let hits = 0;
  for (const kw of keywords) {
    const kwNorm = normalize(kw);
    if (!kwNorm) continue;
    if (kwNorm.includes(" ")) {
      // multi-word keyword: phrase match is strong evidence
      if (descNorm.includes(kwNorm)) hits += 1.5;
    } else if (tokens.has(kwNorm)) {
      hits += 1;
    }
  }
  // Diminishing returns so a single strong hit already gives decent confidence.
  return hits === 0 ? 0 : Math.min(1, 0.45 + 0.2 * hits);
}

export function matchDescription(description: string): MatchResult {
  const descNorm = normalize(description);
  const tokens = new Set(tokenize(description));

  let best: { code: string; label: string; score: number } | null = null;
  for (const acc of SYSCOHADA_LIST) {
    const score = scoreAccount(descNorm, tokens, acc.keywords ?? []);
    if (score <= 0) continue;
    // On (near-)tie, prefer the more specific sub-account (longer code).
    const better =
      !best ||
      score > best.score + 1e-9 ||
      (Math.abs(score - best.score) <= 1e-9 && acc.code.length > best.code.length);
    if (better) {
      best = { code: acc.code, label: acc.label, score };
    }
  }

  if (!best) {
    const fb = SYSCOHADA_LIST.find((a) => a.code === FALLBACK_CODE)!;
    return { code: fb.code, label: fb.label, confidence: 0.3, needsReview: true };
  }

  return {
    code: best.code,
    label: best.label,
    confidence: Number(best.score.toFixed(2)),
    needsReview: best.score < CONFIDENCE_THRESHOLD,
  };
}
