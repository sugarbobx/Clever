/** French-locale formatting helpers (Cameroon). */

export function formatXAF(amount: number | null | undefined): string {
  if (amount == null) return "—";
  // French spacing, XAF suffix: "19 900 XAF"
  return `${Math.round(amount).toLocaleString("fr-FR").replace(/ /g, " ")} XAF`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
