export type Role =
  | "MANAGER_N2"
  | "HR"
  | "EMPLOYEE"
  | "TRAINEE"
  | "CLIENT_INDIVIDUAL"
  | "CLIENT_COMPANY";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientAccountId: string | null;
  onboardingCompleted?: boolean;
}

export type SubscriptionTier = "DECLARANT_SOLO" | "COMPTABLE_PRO" | "GRAND_COMPTE";

export type DocumentStatus =
  | "PENDING_OCR"
  | "PENDING_VALIDATION"
  | "APPROVED"
  | "REJECTED"
  | "PUSHED_TO_QBO"
  | "QBO_ERROR";

export interface DocumentDTO {
  id: string;
  clientId: string;
  source: "WHATSAPP" | "PORTAL" | "STAFF";
  status: DocumentStatus;
  fileName: string;
  vendor: string | null;
  amount: number | null;
  currency: string | null;
  date: string | null;
  vatAmount: number | null;
  vatRate: number | null;
  description: string | null;
  sysohadaCode: string | null;
  sysohadaLabel: string | null;
  ocrConfidence: number | null;
  needsReview: boolean;
  createdAt: string;
  client?: { id: string; name: string; type: string };
  validation?: { action: string; notes: string | null; validatedBy?: { name: string } } | null;
  ocrMissingFields?: string[];
  ocrCategory?: string;
  ocrCompleteness?: number;
  suggestedEntry?: {
    debit: { code: string; label: string; amount: number }[];
    credit: { code: string; label: string; amount: number };
    demo: boolean;
  } | null;
}

export interface ClientAccountDTO {
  id: string;
  name: string;
  type: "INDIVIDUAL" | "COMPANY";
  email: string;
  phone: string | null;
  country: string;
  subscriptionTier: SubscriptionTier;
  documentCount: number;
  assignedStaff?: { name: string } | null;
  qboConnection?: { isActive: boolean; demo: boolean; realmId: string } | null;
  _count?: { documents: number };
}

export interface SysohadaAccountDTO {
  code: string;
  label: string;
  class: number;
  parent?: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  MANAGER_N2: "Manager",
  HR: "Ressources Humaines",
  EMPLOYEE: "Collaborateur",
  TRAINEE: "Stagiaire",
  CLIENT_INDIVIDUAL: "Client — Particulier",
  CLIENT_COMPANY: "Client — Entreprise",
};

export const STAFF_ROLES: Role[] = ["MANAGER_N2", "HR", "EMPLOYEE", "TRAINEE"];
export const CLIENT_ROLES: Role[] = ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"];
