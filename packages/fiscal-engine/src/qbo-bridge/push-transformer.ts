/**
 * Transforms an approved CLEVER document into a QuickBooks Purchase payload
 * (MinorVersion 75 shape). Pure function — no network calls live here; the
 * actual POST is done by @clever/intuit-client.
 */

export interface ApprovedDocument {
  id: string;
  date: string; // ISO date
  amount: number;
  finalAmount?: number | null;
  vatAmount?: number | null;
  description?: string | null;
  vendor?: string | null;
  sysohadaCode?: string | null;
  finalCode?: string | null;
  qboVendorId?: string | null;
}

export interface QboPurchasePayload {
  PaymentType: "Cash" | "Check" | "CreditCard";
  AccountRef: { value: string };
  TxnDate: string;
  TotalAmt: number;
  PrivateNote: string;
  Line: Array<{
    DetailType: "AccountBasedExpenseLineDetail";
    Amount: number;
    AccountBasedExpenseLineDetail: {
      AccountRef: { value: string };
      TaxCodeRef: { value: string };
    };
    Description: string;
  }>;
  EntityRef?: { value: string };
}

export function documentToQboPurchase(doc: ApprovedDocument, qboAccountId: string): QboPurchasePayload {
  const amount = Number(doc.finalAmount ?? doc.amount);
  const code = doc.finalCode ?? doc.sysohadaCode ?? "";
  const description = doc.description ?? doc.vendor ?? "Dépense";
  const payload: QboPurchasePayload = {
    PaymentType: "Cash",
    AccountRef: { value: qboAccountId },
    TxnDate: doc.date,
    TotalAmt: amount,
    PrivateNote: `CLEVER #${doc.id} | SYSCOHADA ${code}`,
    Line: [
      {
        DetailType: "AccountBasedExpenseLineDetail",
        Amount: amount,
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: qboAccountId },
          TaxCodeRef: { value: doc.vatAmount ? "TAX" : "NON" },
        },
        Description: description,
      },
    ],
  };
  if (doc.qboVendorId) payload.EntityRef = { value: doc.qboVendorId };
  return payload;
}
