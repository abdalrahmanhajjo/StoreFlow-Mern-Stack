import { useEffect } from 'react';
import { refreshSession } from './refresh';
import { startTokenRefreshScheduler } from './tokenRefresh';

// On app load:
//  1. Start the proactive refresh scheduler (re-arms on every token change).
//  2. Attempt a silent refresh — the HttpOnly refresh cookie (if present) is
//     exchanged for a fresh in-memory access token, restoring the session
//     without a login prompt. refreshSession() sets status to authenticated on
//     success or unauthenticated on failure.
export function SessionBootstrap() {
  useEffect(() => {
    const stop = startTokenRefreshScheduler();
    void refreshSession();
    return stop;
  }, []);

  return null;
}