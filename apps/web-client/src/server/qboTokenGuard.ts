/**
 * QuickBooks token guard (Phase 4). AES-256-CBC encryption for tokens at rest +
 * the proactive "50-minute" refresh rule (refresh when <10 min from expiry),
 * persisting the rotated refresh token. Only exercised for real connections.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import axios from "axios";
import { prisma } from "./prisma";
import { env } from "./env";

const ENC_KEY = Buffer.from(
  (env.ENCRYPTION_KEY ?? "fallback32charkey12345678901234").padEnd(32, "0"),
  "utf8"
).subarray(0, 32);

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", ENC_KEY, iv);
  return iv.toString("hex") + ":" + Buffer.concat([cipher.update(text), cipher.final()]).toString("hex");
}

export function decrypt(text: string): string {
  const [ivHex, encrypted] = text.split(":");
  const decipher = createDecipheriv("aes-256-cbc", ENC_KEY, Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "hex")), decipher.final()]).toString();
}

/** Return a valid access token, refreshing + rotating it if near expiry. */
export async function ensureFreshToken(clientId: string): Promise<string> {
  const conn = await prisma.qboConnection.findUnique({ where: { clientId } });
  if (!conn || !conn.isActive) throw new Error("QBO_NOT_CONNECTED");

  const tenMin = 10 * 60 * 1000;
  if (Date.now() > conn.tokenExpiry.getTime() - tenMin) {
    const refreshToken = decrypt(conn.refreshToken);
    const credentials = Buffer.from(`${env.QBO_CLIENT_ID}:${env.QBO_CLIENT_SECRET}`).toString("base64");
    const res = await axios.post(
      "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      `grant_type=refresh_token&refresh_token=${refreshToken}`,
      { headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" } }
    );
    await prisma.qboConnection.update({
      where: { clientId },
      data: {
        accessToken: encrypt(res.data.access_token),
        refreshToken: encrypt(res.data.refresh_token), // rotation possible
        tokenExpiry: new Date(Date.now() + res.data.expires_in * 1000),
      },
    });
    return res.data.access_token;
  }

  return decrypt(conn.accessToken);
}
