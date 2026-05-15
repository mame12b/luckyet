import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "luckyet-admin-auth",
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
);
export const isAdmin = (user) => user && ["admin", "super_admin"].includes(user.role);