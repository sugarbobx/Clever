/**
 * SYSCOHADA REVISED (OHADA) account plan — partial but representative tree.
 * This is CLEVER's core IP: the bridge between QuickBooks (US GAAP) account
 * structures and the SYSCOHADA chart used across 17 francophone-African states.
 *
 * `keywords` are French hints used by the fuzzy matcher (matcher.ts).
 */

export interface SysohadaAccount {
  /** Account code, e.g. "6064" */
  code: string;
  /** French label */
  label: string;
  /** SYSCOHADA class 1–9 */
  class: number;
  /** Parent account code, if any */
  parent?: string;
  /** French keywords for description matching */
  keywords?: string[];
}

export const SYSCOHADA_ACCOUNTS = {
  // ── CLASS 6 — CHARGES (most common for expense receipts / NDF) ──
  "60": { label: "Achats et variations de stocks", class: 6 },
  "601": { label: "Achats de marchandises", class: 6, parent: "60", keywords: ["marchandise", "achat", "stock"] },
  "602": { label: "Achats de matières premières", class: 6, parent: "60", keywords: ["matière première", "matiere"] },
  "604": { label: "Achats de matières et fournitures consommables", class: 6, parent: "60" },
  "6041": { label: "Achats de fournitures d'atelier et d'usine", class: 6, parent: "604", keywords: ["atelier", "usine", "outillage"] },
  "6042": { label: "Achats de fournitures de magasin", class: 6, parent: "604", keywords: ["magasin", "entretien", "nettoyage", "eau", "électricité", "electricite"] },
  "6043": { label: "Achats de fournitures de bureau", class: 6, parent: "604", keywords: ["bureau", "papier", "stylo", "cartouche", "imprimante", "fourniture"] },
  "605": { label: "Achats de matériaux", class: 6, parent: "60", keywords: ["matériaux", "ciment", "construction"] },
  "6064": { label: "Fournitures de bureau", class: 6, keywords: ["bureau", "papier", "stylo", "cartouche", "imprimante", "agrafe", "classeur"] },
  "6065": { label: "Fournitures informatiques", class: 6, keywords: ["informatique", "ordinateur", "clavier", "souris", "câble", "cable", "usb", "disque", "écran", "ecran"] },
  "61": { label: "Transports", class: 6 },
  "621": { label: "Personnel extérieur à l'entreprise", class: 6, keywords: ["intérim", "interim", "prestataire", "main d'oeuvre"] },
  "622": { label: "Rémunérations d'intermédiaires et honoraires", class: 6, keywords: ["honoraires", "consultant", "avocat", "expert", "notaire", "comptable"] },
  "624": { label: "Transports de biens et transports collectifs du personnel", class: 6, keywords: ["transport", "livraison", "camion", "fret"] },
  "625": { label: "Déplacements, missions et réceptions", class: 6, keywords: ["voyage", "hôtel", "hotel", "mission", "restaurant", "repas", "taxi", "carburant", "essence", "déplacement", "deplacement"] },
  "6251": { label: "Voyages et déplacements", class: 6, parent: "625", keywords: ["billet", "avion", "train", "transport", "essence", "carburant", "station", "péage", "peage", "taxi"] },
  "6252": { label: "Missions", class: 6, parent: "625", keywords: ["mission", "per diem", "séjour", "sejour"] },
  "6253": { label: "Réceptions", class: 6, parent: "625", keywords: ["restaurant", "repas", "traiteur", "réception", "reception", "déjeuner", "dejeuner", "dîner", "diner"] },
  "626": { label: "Frais postaux et de télécommunications", class: 6, keywords: ["téléphone", "telephone", "internet", "poste", "courrier", "mtn", "orange", "camtel", "forfait", "recharge", "abonnement"] },
  "627": { label: "Services bancaires", class: 6, keywords: ["banque", "virement", "commission", "frais bancaires", "agios"] },
  "628": { label: "Cotisations et autres charges externes", class: 6, keywords: ["cotisation", "assurance", "abonnement"] },
  "631": { label: "Impôts et taxes directs", class: 6, keywords: ["impôt", "impot", "taxe", "patente", "licence"] },
  "632": { label: "Impôts et taxes indirects", class: 6, keywords: ["tva", "droits", "douane"] },
  "641": { label: "Charges de personnel — Rémunérations du personnel", class: 6, keywords: ["salaire", "prime", "personnel", "paie", "indemnité", "indemnite"] },
  "661": { label: "Intérêts des emprunts", class: 6, keywords: ["intérêt", "interet", "emprunt", "crédit", "credit"] },

  // ── CLASS 4 — TIERS ──
  "401": { label: "Fournisseurs", class: 4, keywords: ["fournisseur"] },
  "411": { label: "Clients", class: 4, keywords: ["client"] },
  "421": { label: "Personnel — Avances et acomptes", class: 4, keywords: ["avance", "acompte"] },
  "444": { label: "État — TVA facturée", class: 4, keywords: ["tva facturée", "tva collectée"] },
  "445": { label: "État — TVA récupérable", class: 4, keywords: ["tva récupérable", "tva déductible"] },
  "476": { label: "Charges constatées d'avance", class: 4, keywords: ["charge d'avance", "prépayé", "prepaye"] },

  // ── CLASS 5 — TRÉSORERIE ──
  "521": { label: "Banques", class: 5, keywords: ["banque", "compte bancaire"] },
  "571": { label: "Caisse siège social", class: 5, keywords: ["caisse", "espèces", "especes", "cash"] },

  // ── CLASS 7 — PRODUITS ──
  "701": { label: "Ventes de marchandises", class: 7, keywords: ["vente", "marchandise"] },
  "706": { label: "Services vendus", class: 7, keywords: ["prestation", "service", "honoraires perçus"] },
} as const satisfies Record<string, Omit<SysohadaAccount, "code">>;

export type SysohadaCode = keyof typeof SYSCOHADA_ACCOUNTS;

/** Flat list with `code` included, convenient for seeding + dropdowns. */
export const SYSCOHADA_LIST: SysohadaAccount[] = Object.entries(SYSCOHADA_ACCOUNTS).map(
  ([code, v]) => ({ code, ...(v as Omit<SysohadaAccount, "code">) })
);

/** The 9 SYSCOHADA classes, labelled. */
export const SYSCOHADA_CLASSES: Record<number, string> = {
  1: "Comptes de ressources durables (capitaux)",
  2: "Comptes d'actif immobilisé",
  3: "Comptes de stocks",
  4: "Comptes de tiers (clients/fournisseurs)",
  5: "Comptes de trésorerie",
  6: "Comptes de charges",
  7: "Comptes de produits",
  8: "Comptes des autres charges et produits",
  9: "Comptes analytiques",
};
