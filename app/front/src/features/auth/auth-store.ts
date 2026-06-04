import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createEncryptedStorage } from "@/lib/encrypted-storage";
import type { CurrentUser, UserRole } from "./types";

type AuthState = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (user: CurrentUser) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  updateUser: (partial: Partial<CurrentUser>) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      setRole: (role) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        })),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: "taggy-auth",
      storage: createEncryptedStorage(),
    },
  ),
);

/** Waits for encrypted localStorage rehydration before route guards run. */
export function waitForAuthHydration(): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}
