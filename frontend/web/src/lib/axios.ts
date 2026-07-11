import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useSession } from '@/store/session';
import { refreshSession } from '@/features/auth/refresh';
import { type ApiError, messageForStatus, parseRetryAfter } from '@/lib/http/errors';

// withCredentials sends the HttpOnly refresh cookie to /auth/* endpoints.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
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
  async (error: AxiosError<{ code?: string; message?: string; fields?: Record<string, string> }>) => {
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
    else if (status === 401) code = 'UNAUTHENTICATED';
    else if (status === 403) code = 'FORBIDDEN';
    else if (status === 429) code = 'RATE_LIMITED';
    else if (status && status >= 500) code = 'SERVER';
    else if (!error.response) code = 'NETWORK';
    else code = data?.code ?? 'NETWORK';

    const normalised: ApiError = {
      code,
      status,
      retryAfter,
      // Prefer a safe status-based message; only trust a server message for 4xx validation errors.
      message:
        code === 'TIMEOUT'
          ? 'The request timed out. Please check your connection and try again.'
          : status && status < 500 && status !== 401 && status !== 403 && status !== 429
            ? (data?.message ?? messageForStatus(status, 'Request failed'))
            : messageForStatus(status, data?.message ?? 'Network error'),
      fields: data?.fields,
    };
    return Promise.reject(normalised);
  }
);
