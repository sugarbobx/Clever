import { NextResponse } from "next/server";
import axios from "axios";
import { prisma } from "@/server/prisma";
import { env } from "@/server/env";
import { encrypt } from "@/server/qboTokenGuard";

// Public route: Intuit redirects the browser here after consent.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/integrations/quickbooks/callback?code&realmId&state
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const state = url.searchParams.get("state");
  const base = url.origin;

  if (!code || !realmId || !state) {
    return NextResponse.redirect(`${base}/app/clients?qbo=error`);
  }

  try {
    const { clientId } = JSON.parse(Buffer.from(state, "base64").toString());
    const credentials = Buffer.from(`${env.QBO_CLIENT_ID}:${env.QBO_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await axios.post(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(env.QBO_REDIRECT_URI as string)}`,
      { headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const data = {
      realmId,
      accessToken: encrypt(access_token),
      refreshToken: encrypt(refresh_token),
      tokenExpiry: new Date(Date.now() + expires_in * 1000),
      environment: env.QBO_ENVIRONMENT,
      isActive: true,
      demo: false,
    };
    await prisma.qboConnection.upsert({ where: { clientId }, create: { clientId, ...data }, update: data });
    return NextResponse.redirect(`${base}/app/clients/${clientId}?qbo=connected`);
  } catch (err) {
    console.error("[qbo] OAuth callback error", err);
    return NextResponse.redirect(`${base}/app/clients?qbo=error`);
  }
}
