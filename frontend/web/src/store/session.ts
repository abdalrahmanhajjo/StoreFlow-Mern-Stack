import { create } from 'zustand';

// Mirrors backend UserRole (user.model.ts)
export type Role = 'platform_admin' | 'owner' | 'manager' | 'cashier';

// Mirrors the shape returned by GET /auth/me and the `user` field of
// POST /auth/login (auth.controller.ts)
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  isEmailVerified: boolean;
}

type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface SessionState {
  user: SessionUser | null;
  accessToken: string | null;
  // 'idle' until the first refresh attempt (on app load) resolves either way.
  // Route guards should treat 'idle' as "still checking", not "logged out".
  status: Status;
  setSession: (user: SessionUser, accessToken: string) => void;
  clear: () => void;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  accessToken: null,
  status: 'idle',
  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  clear: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),
}));