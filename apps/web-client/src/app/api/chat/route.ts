import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireAuth } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { CLIENT_ROLES, STAFF_ROLES, type Role } from "@/server/enums";
import type { JwtPayload } from "@/server/jwt";

export const dynamic = "force-dynamic";

const isClient = (role: Role) => CLIENT_ROLES.includes(role);
const isStaff = (role: Role) => STAFF_ROLES.includes(role);

/**
 * Resolve which client thread the request targets and authorize access.
 * Clients are pinned to their own account; staff must pass `?clientId=`.
 */
async function resolveThread(user: JwtPayload, clientIdParam?: string | null): Promise<string> {
  if (isClient(user.role)) {
    if (!user.clientAccountId) throw new ApiError(403, "Aucun compte client associé.");
    return user.clientAccountId;
  }
  if (!clientIdParam) throw new ApiError(400, "Paramètre clientId requis.");
  const exists = await prisma.clientAccount.findFirst({ where: { id: clientIdParam, deletedAt: null } });
  if (!exists) throw new ApiError(404, "Client introuvable.");
  return clientIdParam;
}

// GET /api/chat[?clientId=] — thread messages (oldest first); marks inbound read
export const GET = handle(async (req: Request) => {
  const user = await requireAuth(req);
  const url = new URL(req.url);
  const clientId = await resolveThread(user, url.searchParams.get("clientId"));

  const messages = await prisma.chatMessage.findMany({
    where: { clientId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  // Mark the *other* party's messages as read for this viewer.
  await prisma.chatMessage.updateMany({
    where: { clientId, isRead: false, fromStaff: isClient(user.role) },
    data: { isRead: true },
  });

  return NextResponse.json({ messages });
});

const sendSchema = z.object({
  content: z.string().min(1).max(2000),
  clientId: z.string().optional(),
  documentId: z.string().optional(),
});

// POST /api/chat — send a message into the thread
export const POST = handle(async (req: Request) => {
  const user = await requireAuth(req);
  const body = await req.json().catch(() => ({}));
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Message invalide.");

  const clientId = await resolveThread(user, parsed.data.clientId);
  const message = await prisma.chatMessage.create({
    data: {
      clientId,
      senderId: user.sub,
      fromStaff: isStaff(user.role),
      content: parsed.data.content.trim(),
      documentId: parsed.data.documentId,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
});
