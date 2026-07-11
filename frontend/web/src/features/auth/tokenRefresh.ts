import { useSession } from '@/store/session';
import { getExpiryMs } from '@/lib/jwt';
import { refreshSession } from './refresh';

// Refresh this many ms before the access token actually expires, so in-flight
// requests are never sent with a stale token.
const SKEW_MS = 30_000;

let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

/** (Re)arm the proactive refresh for the given access token. */
function schedule(token: string | null) {
  clearTimer();
  if (!token) return;
  const exp = getExpiryMs(token);
  if (!exp) return; // opaque token -> rely on the 401 interceptor instead

  const delay = exp - Date.now() - SKEW_MS;
  if (delay <= 0) {
    void refreshSession(); // already at/near expiry -> refresh now
    return;
  }
  timer = setTimeout(() => void refreshSession(), delay);
}

/**
 * Starts proactive token refresh. Re-arms whenever the access token changes
 * (login / refresh) and re-checks when a backgrounded tab becomes visible
 * (its timer may have been throttled while hidden). Returns a stop function.
 */
export function startTokenRefreshScheduler(): () => void {
  schedule(useSession.getState().accessToken);

  const unsubscribe = useSession.subscribe((state, prev) => {
    if (state.accessToken !== prev.accessToken) schedule(state.accessToken);
  });

  const onVisibility = () => {
    if (document.visibilityState === 'visible') schedule(useSession.getState().accessToken);
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    clearTimer();
    unsubscribe();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}