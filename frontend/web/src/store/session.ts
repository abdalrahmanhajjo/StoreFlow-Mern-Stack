import { create } from 'zustand';
import type { BusinessType } from '@/lib/contracts/types';

export type Role = 'platform_admin' | 'owner' | 'manager' | 'cashier';

// Store roles from backend StoreMembership (authoritative permission source)
export type StoreRole = 'owner' | 'administrator' | 'manager' | 'cashier' | 'inventory_manager' | 'employee' | 'viewer';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  /** Which store template the signed-in user operates; null for platform admins. */
  businessType: BusinessType | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  user: SessionUser | null;
  /**
   * Access token is kept in memory ONLY — never in localStorage/sessionStorage.
   * This avoids XSS token theft. On reload it is re-obtained via silent refresh
   * (the refresh token lives in an HttpOnly cookie the JS can't read).
   */
  accessToken: string | null;
  status: AuthStatus;
  setSession: (user: SessionUser, accessToken: string) => void;
  setToken: (accessToken: string) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

// NOTE: no `persist` middleware — the token must not touch web storage.
export const useSession = create<SessionState>((set) => ({
  user: null,
  accessToken: null,
  status: 'loading', // until the initial silent-refresh resolves
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  setToken: (accessToken) => set({ accessToken }),
  setStatus: (status) => set({ status }),
  clear: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),
}));

export const useRole = (): Role | null => useSession((s) => s.user?.role ?? null);
