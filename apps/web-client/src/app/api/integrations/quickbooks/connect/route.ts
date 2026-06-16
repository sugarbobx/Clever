import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/prisma";
import { requireAuth, requireRoles } from "@/server/auth";
import { handle, ApiError } from "@/server/http";
import { audit } from "@/server/audit";
import { createQuickBooksClient } from "@clever/intuit-client";
import { env, qboConfigured } from "@/server/env";
import { ROLES } from "@/server/enums";

export const dynamic = "force-dynamic";

const connectSchema = z.object({ clientId: z.string() });

/**
 * POST /api/integrations/quickbooks/connect — DEMO OAuth handshake.
 * Stores a fake QboConnection. Manager only.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireAuth(req);
  requireRoles(user, ROLES.MANAGER_N2);
  const body = await req.json().catch(() => ({}));
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(400, "Client requis.");

  const client = await prisma.clientAccount.findUnique({ where: { id: parsed.data.clientId } });
  if (!client) throw new ApiError(404, "Client introuvable.");

  // Real OAuth: hand the browser an Intuit consent URL (callback finishes it).
  if (qboConfigured) {
    const state = Buffer.from(JSON.stringify({ clientId: client.id })).toString("base64");
    const params = new URLSearchParams({
      client_id: env.QBO_CLIENT_ID as string,
      response_type: "code",
      scope: "com.intuit.quickbooks.accounting",
      redirect_uri: env.QBO_REDIRECT_URI as string,
      state,
    });
    return NextResponse.json({ authUrl: `https://appcenter.intuit.com/connect/oauth2?${params.toString()}` });
  }

  // Mock OAuth handshake (local MVP).
  const qbo = createQuickBooksClient();
  const result = await qbo.connect();

  const conn = await prisma.qboConnection.upsert({
    where: { clientId: client.id },
    create: {
      clientId: client.id,
      realmId: result.data.realmId,
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      tokenExpiry: new Date(result.data.tokenExpiry),
      environment: "sandbox",
      isActive: true,
      demo: true,
    },
    update: { isActive: true, tokenExpiry: new Date(result.data.tokenExpiry) },
  });
  await audit({
    actorId: user.sub,
    actorName: user.name,
    action: "QBO_CONNECTED",
    entity: "ClientAccount",
    entityId: client.id,
    detail: `realm ${conn.realmId} (démo)`,
  });
  return NextResponse.json({ connection: conn, demo: true });
});
