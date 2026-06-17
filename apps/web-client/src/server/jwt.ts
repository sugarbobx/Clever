import jwt from "jsonwebtoken";
import { env } from "./env";
import type { Role } from "./enums";

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  name: string;
  email: string;
  clientAccountId?: string | null;
}

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: Pick<JwtPayload, "sub">): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}

const secureCookies =
  env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false";

/** httpOnly cookie options (no Secure in dev so localhost works over http). */
export const accessCookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: secureCookies,
  maxAge: 15 * 60 * 1000,
  path: "/",
};

export const refreshCookieOpts = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: secureCookies,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const ACCESS_COOKIE = "clever_at";
export const REFRESH_COOKIE = "clever_rt";
