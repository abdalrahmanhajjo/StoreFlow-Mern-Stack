import { useEffect } from 'react';
import { refreshSession } from './refresh';
import { startTokenRefreshScheduler } from './tokenRefresh';
import { api } from '@/lib/axios';
import { useSession } from '@/store/session';
import { USE_MOCK } from './authService';

// Side-effect import: subscribes to the session and hydrates the workspace
// stores from the API whenever a store-staff session appears.
import '@/lib/api/hydrate';

const SESSION_CHECK_MS = 3000;

export function SessionBootstrap() {
  useEffect(() => {
    const stop = startTokenRefreshScheduler();

    void refreshSession();

    const interval = window.setInterval(async () => {
      const { status } = useSession.getState();

      if (status !== 'authenticated') return;
      if (USE_MOCK) return;

      try {
        await api.get('/auth/session-status');
      } catch (err: any) {
        if (err?.status === 401) {
          useSession.getState().clear();

          window.location.href = '/login?reason=session-ended';
        }
      }
    }, SESSION_CHECK_MS);

    return () => {
      stop();
      window.clearInterval(interval);
    };
  }, []);

  return null;
}