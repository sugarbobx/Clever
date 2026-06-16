import { prisma } from "./prisma";

/** Append an immutable audit-log entry. Never throws into the request path. */
export async function audit(params: {
  actorId?: string | null;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  detail?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({ data: params });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] write failed", err);
  }
}
