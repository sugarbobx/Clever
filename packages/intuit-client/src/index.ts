/**
 * @clever/intuit-client — QuickBooks Online V3 client wrappers.
 *
 * LOCAL MVP: this is a MOCK. Every method returns a representative payload with
 * `demo: true` and never touches the network. The method signatures mirror the
 * real QBO V3 REST API (MinorVersion 75) so a live transport can be dropped in
 * later behind the same interface (server-backed phase).
 */

export const QBO_MINOR_VERSION = 75;

export interface QboConfig {
  clientId?: string;
  clientSecret?: string;
  environment?: "sandbox" | "production";
  realmId?: string;
  accessToken?: string;
}

export interface QboResult<T = unknown> {
  demo: boolean;
  ok: boolean;
  entity: string;
  data: T;
  minorVersion: number;
}

function fakeId(prefix: string): string {
  return `${prefix}_${Math.floor(100000 + Math.random() * 899999)}`;
}

function wrap<T>(entity: string, data: T): QboResult<T> {
  return { demo: true, ok: true, entity, data, minorVersion: QBO_MINOR_VERSION };
}

export class QuickBooksClient {
  constructor(private readonly config: QboConfig = {}) {}

  /** Is a (mock) connection configured? */
  get isConnected(): boolean {
    return Boolean(this.config.realmId);
  }

  /** Simulate the OAuth2 authorization-code exchange. */
  async connect(realmId = fakeId("realm")): Promise<QboResult<{ realmId: string; tokenExpiry: string }>> {
    this.config.realmId = realmId;
    this.config.accessToken = fakeId("tok");
    const tokenExpiry = new Date(Date.now() + 3600_000).toISOString();
    return wrap("OAuth", { realmId, tokenExpiry });
  }

  async createPurchase(payload: unknown): Promise<QboResult<{ Id: string; Purchase: unknown }>> {
    return wrap("Purchase", { Id: fakeId("PUR"), Purchase: payload });
  }

  async createPayment(payload: unknown): Promise<QboResult<{ Id: string; Payment: unknown }>> {
    return wrap("Payment", { Id: fakeId("PAY"), Payment: payload });
  }

  async createInvoice(payload: unknown): Promise<QboResult<{ Id: string; Invoice: unknown }>> {
    return wrap("Invoice", { Id: fakeId("INV"), Invoice: payload });
  }

  async createJournalEntry(payload: unknown): Promise<QboResult<{ Id: string; JournalEntry: unknown }>> {
    return wrap("JournalEntry", { Id: fakeId("JE"), JournalEntry: payload });
  }

  /** List chart-of-accounts entries (sample). */
  async listAccounts(): Promise<QboResult<Array<{ Id: string; Name: string; AccountType: string }>>> {
    return wrap("Account", [
      { Id: "33", Name: "Office Supplies", AccountType: "Expense" },
      { Id: "41", Name: "Travel", AccountType: "Expense" },
      { Id: "55", Name: "Meals and Entertainment", AccountType: "Expense" },
      { Id: "62", Name: "Phone & Internet", AccountType: "Expense" },
    ]);
  }
}

export function createQuickBooksClient(config?: QboConfig): QuickBooksClient {
  return new QuickBooksClient(config);
}
