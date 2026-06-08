
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "luckyet-auth",
      // Persist both user AND accessToken
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
);
updateUser: (newUser) => set({ user: newUser })