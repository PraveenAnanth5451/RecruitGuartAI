import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@shared/routes";

interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  userId: number | null;
  login: (email: string, userId?: number) => void;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  hydrateFromSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      email: null,
      userId: null,
      login: (email, userId) => set({ isAuthenticated: true, email, userId: userId ?? null }),
      logout: async () => {
        await fetch(api.auth.logout.path, {
          method: api.auth.logout.method,
          credentials: "include",
        }).catch(() => undefined);
        set({ isAuthenticated: false, email: null, userId: null });
      },
      register: async (email, password) => {
        const res = await fetch(api.auth.register.path, {
          method: api.auth.register.method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || "Register failed");
        set({ isAuthenticated: true, email: payload.user.email, userId: payload.user.id });
      },
      loginWithPassword: async (email, password) => {
        const res = await fetch(api.auth.login.path, {
          method: api.auth.login.method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || "Login failed");
        set({ isAuthenticated: true, email: payload.user.email, userId: payload.user.id });
      },
      hydrateFromSession: async () => {
        const res = await fetch(api.auth.me.path, {
          method: api.auth.me.method,
          credentials: "include",
        });
        const payload = await res.json().catch(() => ({ user: null }));
        if (payload?.user?.email) {
          set({ isAuthenticated: true, email: payload.user.email, userId: payload.user.id });
        } else {
          set({ isAuthenticated: false, email: null, userId: null });
        }
      },
    }),
    {
      name: "recruitguard-auth",
    }
  )
);
