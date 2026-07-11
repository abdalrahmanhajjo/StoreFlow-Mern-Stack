import { authService } from './authService';
import { useSession } from '@/store/session';

// Single-flight refresh shared by the 401 interceptor (api.ts) and the
// proactive scheduler (tokenRefresh.ts), so concurrent triggers never fire
// more than one /auth/refresh at a time.
let inFlight: Promise<string | null> | null = null;

export function refreshSession(): Promise<string | null> {
  if (inFlight) return inFlight;

  inFlight = authService
    .refresh()
    .then(async ({ accessToken }) => {
      // Backend only returns a new access token here — fetch the profile
      // (name, role, storeId, isEmailVerified) separately, same as on login.
      const user = await authService.me(accessToken);
      useSession.getState().setSession(user, accessToken);
      return accessToken;
    })
    .catch(() => {
      useSession.getState().clear();
      return null;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}