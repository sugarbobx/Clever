import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
  roles: Role[];
  soon?: boolean;
}

export const STAFF_NAV: NavItem[] = [
  { href: "/app/dashboard", label: "Tableau de bord", icon: "LayoutDashboard", roles: ["MANAGER_N2", "HR", "EMPLOYEE", "TRAINEE"] },
  { href: "/app/queue", label: "File de validation", icon: "Inbox", roles: ["MANAGER_N2", "EMPLOYEE", "TRAINEE"] },
  { href: "/app/documents", label: "Documents", icon: "FileText", roles: ["MANAGER_N2", "EMPLOYEE"] },
  { href: "/app/clients", label: "Clients", icon: "Users", roles: ["MANAGER_N2", "EMPLOYEE"] },
  { href: "/app/objectives", label: "Objectifs", icon: "Target", roles: ["MANAGER_N2"] },
  { href: "/app/my-objectives", label: "Objectifs", icon: "Target", roles: ["EMPLOYEE", "TRAINEE"] },
  { href: "/app/team", label: "Équipe", icon: "UserCog", roles: ["MANAGER_N2", "HR"] },
  { href: "/app/expenses", label: "Notes de frais", icon: "Receipt", roles: ["HR"], soon: true },
  { href: "/app/payroll", label: "Paie", icon: "Wallet", roles: ["HR"], soon: true },
  { href: "/app/audit", label: "Journal d'audit", icon: "ScrollText", roles: ["MANAGER_N2", "HR"] },
];

export const CLIENT_NAV: NavItem[] = [
  { href: "/client/dashboard", label: "Tableau de bord", icon: "LayoutDashboard", roles: ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"] },
  { href: "/client/documents", label: "Mes documents", icon: "FileText", roles: ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"] },
  { href: "/client/tax", label: "Fiscalité", icon: "Calculator", roles: ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"] },
  { href: "/client/comptabilite", label: "Comptabilité", icon: "Landmark", roles: ["CLIENT_INDIVIDUAL"] },
  { href: "/client/apar", label: "Clients / Fournisseurs", icon: "ArrowLeftRight", roles: ["CLIENT_COMPANY"], soon: true },
  { href: "/client/chat", label: "Messagerie", icon: "MessageSquare", roles: ["CLIENT_INDIVIDUAL", "CLIENT_COMPANY"] },
];
