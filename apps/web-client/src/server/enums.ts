/** String-enum constants (SQLite has no native enums). */

export const ROLES = {
  MANAGER_N2: "MANAGER_N2",
  HR: "HR",
  EMPLOYEE: "EMPLOYEE",
  TRAINEE: "TRAINEE",
  CLIENT_INDIVIDUAL: "CLIENT_INDIVIDUAL",
  CLIENT_COMPANY: "CLIENT_COMPANY",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES = Object.values(ROLES) as Role[];

export const STAFF_ROLES: Role[] = [ROLES.MANAGER_N2, ROLES.HR, ROLES.EMPLOYEE, ROLES.TRAINEE];
export const CLIENT_ROLES: Role[] = [ROLES.CLIENT_INDIVIDUAL, ROLES.CLIENT_COMPANY];
/** Roles allowed to validate documents (write to the ledger). */
export const VALIDATOR_ROLES: Role[] = [ROLES.MANAGER_N2, ROLES.EMPLOYEE];

export const CLIENT_TYPES = { INDIVIDUAL: "INDIVIDUAL", COMPANY: "COMPANY" } as const;
export type ClientType = (typeof CLIENT_TYPES)[keyof typeof CLIENT_TYPES];

export const SUBSCRIPTION_TIERS = {
  DECLARANT_SOLO: "DECLARANT_SOLO",
  COMPTABLE_PRO: "COMPTABLE_PRO",
  GRAND_COMPTE: "GRAND_COMPTE",
} as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS];

/** Monthly document caps per tier (null = unlimited). */
export const TIER_DOC_LIMIT: Record<SubscriptionTier, number | null> = {
  DECLARANT_SOLO: 30,
  COMPTABLE_PRO: null,
  GRAND_COMPTE: null,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  DECLARANT_SOLO: "Déclarant Solo",
  COMPTABLE_PRO: "Comptable Pro",
  GRAND_COMPTE: "Grand Compte",
};

export const TIER_PRICE_XAF: Record<SubscriptionTier, number> = {
  DECLARANT_SOLO: 19900,
  COMPTABLE_PRO: 59900,
  GRAND_COMPTE: 199000,
};

export const DOCUMENT_SOURCES = { WHATSAPP: "WHATSAPP", PORTAL: "PORTAL", STAFF: "STAFF" } as const;

export const DOCUMENT_STATUS = {
  PENDING_OCR: "PENDING_OCR",
  PENDING_VALIDATION: "PENDING_VALIDATION",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PUSHED_TO_QBO: "PUSHED_TO_QBO",
  QBO_ERROR: "QBO_ERROR",
} as const;

export const VALIDATION_ACTIONS = { APPROVED: "APPROVED", REJECTED: "REJECTED", EDITED: "EDITED" } as const;
