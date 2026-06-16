/**
 * QuickBooks push (Phase 4), dual-mode:
 *   - real:  ensureFreshToken → POST /v3/company/{realmId}/purchase (minorversion 75),
 *   - mock:  the existing @clever/intuit-client (demo payload), unchanged behaviour.
 * `executePush` performs the push and returns the outcome (the caller owns the
 * document status update). `pushToQbo` is a standalone worker entry for the Bull
 * queue that also updates the status.
 */
import axios from "axios";
import { prisma } from "./prisma";
import { qboConfigured } from "./env";
import { ensureFreshToken } from "./qboTokenGuard";
import { createQuickBooksClient } from "@clever/intuit-client";
import { documentToQboPurchase } from "@clever/fiscal-engine";
import { DOCUMENT_STATUS } from "./enums";

interface PushDoc {
  id: string;
  clientId: string;
  date: Date | null;
  amount: number | null;
  vatAmount: number | null;
  description: string | null;
  vendor: string | null;
  sysohadaCode: string | null;
  client: {
    id: string;
    qboConnection: { realmId: string; environment: string; isActive: boolean; demo: boolean } | null;
  };
}

export interface PushResult {
  demo: boolean;
  id: string;
  ok: boolean;
}

const DEFAULT_EXPENSE_ACCOUNT_ID = "1"; // MVP default; per-client QBO mapping is a later refinement

export async function executePush(
  doc: PushDoc,
  opts: { effectiveCode: string; finalAmount?: number }
): Promise<PushResult> {
  const conn = doc.client.qboConnection;
  const amount = Number(opts.finalAmount ?? doc.amount ?? 0);

  // Real push only when a non-demo active connection AND credentials exist.
  if (conn && conn.isActive && !conn.demo && qboConfigured) {
    try {
      const token = await ensureFreshToken(doc.clientId);
      const baseUrl =
        conn.environment === "production"
          ? "https://quickbooks.api.intuit.com"
          : "https://sandbox-quickbooks.api.intuit.com";
      const payload = {
        PaymentType: "Cash",
        AccountRef: { value: "35", name: "Caisse" },
        TxnDate: (doc.date ?? new Date()).toISOString().slice(0, 10),
        TotalAmt: amount,
        PrivateNote: `CLEVER #${doc.id.slice(0, 8).toUpperCase()} | SYSCOHADA ${opts.effectiveCode}`,
        Line: [
          {
            Amount: amount,
            DetailType: "AccountBasedExpenseLineDetail",
            AccountBasedExpenseLineDetail: {
              AccountRef: { value: DEFAULT_EXPENSE_ACCOUNT_ID },
              TaxCodeRef: doc.vatAmount ? { value: "TAX" } : { value: "NON" },
            },
            Description: doc.description ?? doc.vendor ?? "",
          },
        ],
      };
      const res = await axios.post(`${baseUrl}/v3/company/${conn.realmId}/purchase?minorversion=75`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      });
      return { demo: false, id: res.data?.Purchase?.Id ?? "", ok: true };
    } catch (err) {
      const e = err as { response?: { data?: unknown }; message?: string };
      console.error("[qbo] push error", e.response?.data ?? e.message);
      return { demo: false, id: "", ok: false };
    }
  }

  // Mock push (local MVP / demo connection).
  const qbo = createQuickBooksClient({ realmId: conn?.realmId ?? doc.client.id });
  const payload = documentToQboPurchase(
    {
      id: doc.id,
      date: (doc.date ?? new Date()).toISOString().slice(0, 10),
      amount: doc.amount ?? 0,
      finalAmount: opts.finalAmount,
      vatAmount: doc.vatAmount,
      description: doc.description,
      vendor: doc.vendor,
      sysohadaCode: doc.sysohadaCode,
      finalCode: opts.effectiveCode,
    },
    "33"
  );
  const res = await qbo.createPurchase(payload);
  return { demo: true, id: res.data.Id, ok: true };
}

/** Bull-queue entry point: push a document and update its status. */
export async function pushToQbo(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { client: { include: { qboConnection: true } } },
  });
  if (!doc) return;
  const result = await executePush(doc as unknown as PushDoc, {
    effectiveCode: doc.sysohadaCode ?? "6043",
    finalAmount: doc.amount ?? undefined,
  });
  await prisma.document.update({
    where: { id: documentId },
    data: { status: result.ok ? DOCUMENT_STATUS.PUSHED_TO_QBO : DOCUMENT_STATUS.QBO_ERROR },
  });
}
