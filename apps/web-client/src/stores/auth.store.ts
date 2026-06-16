import { create } from "zustand";
import type { User } from "@/lib/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  loadMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: User }>;
  register: (body: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  loadMe: async () => {
    const { data } = await api.get<{ user: User }>("/auth/me");
    set({ user: data?.user ?? null, loading: false });
  },
  login: async (email, password) => {
    const { data, error } = await api.post<{ user: User }>("/auth/login", { email, password });
    if (data?.user) {
      set({ user: data.user, loading: false });
      return { ok: true, user: data.user };
    }
    return { ok: false, error: error ?? "Échec de la connexion." };
  },
  register: async (body) => {
    const { data, error } = await api.post<{ user: User }>("/auth/register", body);
    if (data?.user) {
      set({ user: data.user, loading: false });
      return { ok: true, user: data.user };
    }
    return { ok: false, error: error ?? "Échec de l'inscription." };
  },
  logout: async () => {
    await api.post("/auth/logout");
    set({ user: null });
  },
  setUser: (u) => set({ user: u }),
}));

/** Default landing route for a role after login. */
export function homeForRole(role: User["role"]): string {
  if (role === "CLIENT_INDIVIDUAL" || role === "CLIENT_COMPANY") return "/client/dashboard";
  return "/app/dashboard";
}
