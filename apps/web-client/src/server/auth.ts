import { cookies } from "next/headers";
import { ApiError } from "./http";
import { ACCESS_COOKIE, verifyAccessToken, type JwtPayload } from "./jwt";
import type { Role } from "./enums";

/**
 * Resolve the current user from the httpOnly access cookie, or (for API
 * testing) a `Authorization: Bearer <token>` header. Returns null if absent or
 * invalid.
 */
export async function getUser(req?: Request): Promise<JwtPayload | null> {
  // Next 15+: cookies() is async and must be awaited.
  let token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token && req) {
    const header = req.headers.get("authorization");
    if (header?.startsWith("Bearer ")) token = header.slice(7);
  }
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

/** Require a valid session. Throws 401 otherwise. */
export async function requireAuth(req?: Request): Promise<JwtPayload> {
  const user = await getUser(req);
  if (!user) throw new ApiError(401, "Non authentifié.");
  return user;
}

/** Require the session to hold one of `roles`. Always enforced server-side. */
export function requireRoles(user: JwtPayload, ...roles: Role[]): void {
  if (!roles.includes(user.role)) throw new ApiError(403, "Accès refusé.");
}

/** Convenience: require a valid session AND one of `roles`. */
export async function requireAuthWithRoles(req: Request | undefined, ...roles: Role[]): Promise<JwtPayload> {
  const user = await requireAuth(req);
  requireRoles(user, ...roles);
  return user;
}
