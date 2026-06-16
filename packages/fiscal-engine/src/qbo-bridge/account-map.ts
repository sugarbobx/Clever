/**
 * Maps QuickBooks Online AccountType/AccountSubType strings → SYSCOHADA codes.
 * Used when ingesting QBO chart-of-accounts data or transforming records.
 */
export const QBO_TO_SYSCOHADA: Record<string, string> = {
  "Expense/OfficeGeneralAdministrativeExpenses": "6043",
  "Expense/AdvertisingPromotional": "628",
  "Expense/Travel": "6251",
  "Expense/Meals": "6253",
  "Expense/UtilitiesGasAndElectric": "6042",
  "Expense/PhoneInternet": "626",
  "Expense/BankCharges": "627",
  "Expense/Payroll": "641",
  "OtherCurrentLiability/SalesTax": "444",
  "OtherCurrentAsset/PrepaidExpenses": "476",
  AccountsReceivable: "411",
  AccountsPayable: "401",
  Bank: "521",
};

export function qboTypeToSysohada(qboType: string): string | null {
  return QBO_TO_SYSCOHADA[qboType] ?? null;
}
