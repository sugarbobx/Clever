/**
 * Typed API client. Wraps fetch, always sends credentials (httpOnly cookies),
 * auto-refreshes the access token once on 401, and returns { data, error }
 * instead of throwing.
 */
// Same-origin: the API now lives inside this Next.js app under /api.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  status: number;
  upgradeRequired?: boolean;
}

async function raw<T>(method: string, path: string, body?: unknown, isRetry = false): Promise<ApiResult<T>> {
  try {
    const isForm = body instanceof FormData;
    const res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "include",
      headers: isForm ? undefined : body ? { "Content-Type": "application/json" } : undefined,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });

    // Try a single silent refresh on 401 (except for auth endpoints).
    if (res.status === 401 && !isRetry && !path.startsWith("/auth/")) {
      const refreshed = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
      if (refreshed.ok) return raw<T>(method, path, body, true);
    }

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      return {
        data: null,
        error: json?.message ?? "Une erreur est survenue.",
        status: res.status,
        upgradeRequired: json?.upgrade_required === true,
      };
    }
    return { data: json as T, error: null, status: res.status };
  } catch {
    return { data: null, error: "Impossible de joindre le serveur.", status: 0 };
  }
}

export const api = {
  get: <T>(path: string) => raw<T>("GET", path),
  post: <T>(path: string, body?: unknown) => raw<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => raw<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => raw<T>("PATCH", path, body),
  del: <T>(path: string) => raw<T>("DELETE", path),
  upload: <T>(path: string, form: FormData) => raw<T>("POST", path, form),
};

export const API_BASE = BASE;
