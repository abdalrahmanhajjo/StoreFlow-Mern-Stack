import { useSession } from '@/store/session';
import { refreshSession } from '@/features/auth/refresh';

// Your routes are mounted at http://localhost:5000/api/auth/... (auth.routes.ts),
// so the shared base is http://localhost:5000/api.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// Normalized error shape every caller can rely on. Your controllers never send
// a `code` field (only `message`, and `errors` for zod validation failures),
// so `code` falls back to the HTTP status as a string — check `status` for
// branching logic (e.g. 403 vs 409), `message` for display text.
export interface ApiErr {
  status: number;
  code: string;
  message: string;
  fields?: Record<string, string>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** No Authorization header — for register/login/forgot-password, called before we have a token. */
  skipAuth?: boolean;
  /** Explicit token to use instead of the one in the session store (see authService.me). */
  token?: string;
  /** Internal — prevents the 401 handler from retrying forever. */
  skipRetry?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false, token, skipRetry = false } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = token ?? useSession.getState().accessToken;
  if (!skipAuth && authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include', // required so the httpOnly refresh cookie is sent/received
    body: body ? JSON.stringify(body) : undefined,
  });

  // Access token expired mid-session (the 15-min window elapsed) — refresh
  // once and retry the original request. The proactive scheduler in
  // tokenRefresh.ts should normally beat us to this, but this is the safety net.
  if (res.status === 401 && !skipAuth && !skipRetry) {
    const newToken = await refreshSession();
    if (newToken) return request<T>(path, { ...opts, skipRetry: true });
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: ApiErr = {
      status: res.status,
      code: data.code ?? String(res.status),
      message: data.message ?? 'Something went wrong',
      fields: data.errors?.fieldErrors,
    };
    throw err;
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: 'DELETE' }),
};