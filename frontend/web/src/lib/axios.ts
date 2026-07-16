import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useSession } from '@/store/session';
import { refreshSession } from '@/features/auth/refresh';
import { type ApiError, messageForStatus, parseRetryAfter } from '@/lib/http/errors';

// withCredentials sends the HttpOnly refresh cookie to /auth/* endpoints.
export const api = axios.create({
  // Default to relative /api — works when backend serves frontend (same origin).
  // For local dev with a different API port, set VITE_API_BASE_URL in .env.
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
  timeout: 15_000, // fail fast instead of hanging the UI indefinitely
});

// Attach the in-memory access token (never read from storage) + tenant scope.
api.interceptors.request.use((config) => {
  const { accessToken, user } = useSession.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (user?.storeId) config.headers['X-Store-Id'] = user.storeId;
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{
    code?: string;
    message?: string;
    fields?: Record<string, string>;
    /** Zod issues from validate.middleware — [{ field: 'body.x', message }] */
    errors?: Array<{ field?: string; message?: string }>;
  }>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes('/auth/');

    // Reactive fallback: if a request still hits a 401 (e.g. tab was asleep),
    // do one shared silent refresh via refreshSession(), then replay the request.
    if (status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const token = await refreshSession();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }

    const data = error.response?.data;
    const retryAfter = parseRetryAfter(error.response?.headers?.['retry-after']);

    let code: ApiError['code'];
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') code = 'TIMEOUT';
    // A 401 from an /auth/ call is a credentials problem ("Invalid email or
    // password"), not an expired session — keep the server's story.
    else if (status === 401 && isAuthCall) code = data?.code ?? 'AUTH_INVALID';
    else if (status === 401) code = 'UNAUTHENTICATED';
    // A 403 with a server code is a domain state (PENDING_APPROVAL,
    // EMAIL_UNVERIFIED, …) the UI switches on — don't flatten it to FORBIDDEN.
    else if (status === 403) code = data?.code ?? 'FORBIDDEN';
    else if (status === 429) code = 'RATE_LIMITED';
    else if (status && status >= 500) code = 'SERVER';
    else if (!error.response) code = 'NETWORK';
    else code = data?.code ?? 'NETWORK';

    const domain403 = status === 403 && Boolean(data?.code) && Boolean(data?.message);
    const authInvalid401 = status === 401 && isAuthCall && Boolean(data?.message);

    // A bare "Validation failed" hides the actual problem — surface the first
    // field issue the server reported so the user knows what to fix.
    const firstIssue = Array.isArray(data?.errors)
      ? data.errors.find((e) => e?.message)?.message
      : undefined;

    const normalised: ApiError = {
      code,
      status,
      retryAfter,
      // Prefer a safe status-based message; only trust a server message for 4xx
      // validation errors and coded 403 domain states.
      message:
        code === 'TIMEOUT'
          ? 'The request timed out. Please check your connection and try again.'
          : domain403 || authInvalid401
            ? data!.message!
            : status && status < 500 && status !== 401 && status !== 403 && status !== 429
              ? (firstIssue ?? data?.message ?? messageForStatus(status, 'Request failed'))
              : messageForStatus(status, data?.message ?? 'Network error'),
      fields: data?.fields,
    };
    return Promise.reject(normalised);
  }
);
