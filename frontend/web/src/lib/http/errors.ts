// Normalised, UI-safe error shape produced by the axios interceptor. Screens and
// React Query `onError` handlers switch on `code`/`status` rather than digging
// into axios internals.
export type ApiErrorCode =
  | 'AUTH_INVALID'
  | 'UNAUTHENTICATED' // 401 after refresh failed
  | 'FORBIDDEN' // 403
  | 'RATE_LIMITED' // 429
  | 'SERVER' // 5xx
  | 'TIMEOUT'
  | 'NETWORK'
  | string;

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  status?: number;
  /** Seconds to wait before retrying (from a 429/503 `Retry-After` header). */
  retryAfter?: number;
  /** Per-field messages for form errors. */
  fields?: Record<string, string>;
}

/** A user-safe message for each class of failure. Never leak server internals. */
export function messageForStatus(status: number | undefined, fallback: string): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return "You don't have permission to do that.";
    case 429:
      return 'Too many requests. Please slow down and try again shortly.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Something went wrong on our end. Please try again.';
    default:
      return fallback;
  }
}

/** Parse a `Retry-After` header (delta-seconds or HTTP-date) into seconds. */
export function parseRetryAfter(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs);
  const when = Date.parse(value);
  if (Number.isNaN(when)) return undefined;
  return Math.max(0, Math.round((when - Date.now()) / 1000));
}
