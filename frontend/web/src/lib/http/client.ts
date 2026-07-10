import type { z } from 'zod';
import type { ApiProblem, HttpMethod } from '@/lib/contracts/types';
import { toApiProblem } from '@/lib/contracts/schemas';
import type { ApiError } from './errors';
import type { OfflineQueue } from '@/lib/offline/queue';

// Typed API client layered over the axios instance. It:
//  - validates every response through a contract schema (catches API drift),
//  - stamps each request with a correlation id (also used as an idempotency key),
//  - normalises every failure to an ApiProblem (never leaks raw internals),
//  - routes writes to the offline queue when disconnected.

/** Minimal transport contract — the real axios `api` satisfies this. The client
 *  validates/casts `data` itself, so the transport returns it as `unknown`. */
export interface HttpLike {
  get(url: string, config?: RequestConfig): Promise<{ data: unknown; headers?: unknown }>;
  request(config: RequestConfig & { url: string; method: string }): Promise<{ data: unknown; headers?: unknown }>;
}
export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

export const CORRELATION_HEADER = 'X-Correlation-Id';
export const IDEMPOTENCY_HEADER = 'Idempotency-Key';

export function newCorrelationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'cid_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function isApiProblem(value: unknown): value is ApiProblem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    'status' in value &&
    typeof (value as ApiProblem).status === 'number'
  );
}

// Map the axios interceptor's ApiError (or anything) into an ApiProblem.
function normaliseError(err: unknown, correlationId: string): ApiProblem {
  if (isApiProblem(err)) return { ...err, correlationId: err.correlationId ?? correlationId };
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const e = err as ApiError;
    return {
      type: `urn:storeflow:${String(e.code).toLowerCase()}`,
      title: e.message ?? 'Request failed',
      status: e.status ?? 0,
      correlationId,
      errors: e.fields ? Object.fromEntries(Object.entries(e.fields).map(([k, v]) => [k, [v]])) : undefined,
    };
  }
  return toApiProblem(err, 0);
}

export type WriteResult<T> =
  | { queued: false; data: T; correlationId: string }
  | { queued: true; mutationId: string; correlationId: string };

export interface WriteOptions<T> {
  /** Schema used to validate/parse the response body. */
  schema?: z.ZodType<T>;
  /** Offline routing. When offline (or the request fails with no response) the
   *  write is persisted to this queue instead of being lost. */
  offline?: {
    queue: OfflineQueue;
    /** Regulated/sensitive write — never queued+auto-synced unless allowed. */
    sensitive: boolean;
    /** Explicit opt-in to permit a sensitive write offline (default false). */
    allowSensitive?: boolean;
  };
  correlationId?: string;
  signal?: AbortSignal;
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export interface ApiClient {
  get<T>(url: string, schema: z.ZodType<T>, config?: RequestConfig): Promise<T>;
  write<T>(method: HttpMethod, url: string, body: unknown, opts?: WriteOptions<T>): Promise<WriteResult<T>>;
  post<T>(url: string, body: unknown, opts?: WriteOptions<T>): Promise<WriteResult<T>>;
  put<T>(url: string, body: unknown, opts?: WriteOptions<T>): Promise<WriteResult<T>>;
  patch<T>(url: string, body: unknown, opts?: WriteOptions<T>): Promise<WriteResult<T>>;
  del<T>(url: string, opts?: WriteOptions<T>): Promise<WriteResult<T>>;
}

export interface ApiClientOptions {
  /** Invoked with the normalised problem whenever a request fails (telemetry). */
  onError?: (problem: ApiProblem, endpoint: string) => void;
}

export function createApiClient(http: HttpLike, options: ApiClientOptions = {}): ApiClient {
  const report = (problem: ApiProblem, endpoint: string): ApiProblem => {
    options.onError?.(problem, endpoint);
    return problem;
  };

  async function get<T>(url: string, schema: z.ZodType<T>, config: RequestConfig = {}): Promise<T> {
    const correlationId = newCorrelationId();
    try {
      const res = await http.get(url, {
        ...config,
        headers: { ...config.headers, [CORRELATION_HEADER]: correlationId },
      });
      const parsed = schema.safeParse(res.data);
      if (!parsed.success) {
        if (import.meta.env.DEV) console.warn(`[api] response failed validation for GET ${url}`, parsed.error.flatten());
        throw {
          type: 'urn:storeflow:invalid-response',
          title: 'The server returned unexpected data.',
          status: 502,
          correlationId,
        } satisfies ApiProblem;
      }
      return parsed.data;
    } catch (err) {
      throw report(normaliseError(err, correlationId), url);
    }
  }

  async function write<T>(
    method: HttpMethod,
    url: string,
    body: unknown,
    opts: WriteOptions<T> = {}
  ): Promise<WriteResult<T>> {
    const correlationId = opts.correlationId ?? newCorrelationId();
    const sensitive = opts.offline?.sensitive ?? false;
    const allowSensitive = opts.offline?.allowSensitive ?? false;

    const canQueue = !!opts.offline && (!sensitive || allowSensitive);

    // Regulated write attempted offline without opt-in → refuse, don't queue.
    if (!isOnline() && opts.offline && sensitive && !allowSensitive) {
      throw report(
        {
          type: 'urn:storeflow:offline-regulated-blocked',
          title: 'This action is not available offline.',
          status: 0,
          correlationId,
        },
        url
      );
    }

    // Known-offline → queue immediately (if eligible) rather than attempt.
    if (!isOnline() && canQueue) {
      const m = await opts.offline!.queue.enqueue({ endpoint: url, method, payload: body, sensitive, correlationId });
      return { queued: true, mutationId: m.id, correlationId };
    }

    try {
      const res = await http.request({
        url,
        method,
        headers: { [CORRELATION_HEADER]: correlationId, [IDEMPOTENCY_HEADER]: correlationId },
        signal: opts.signal,
        ...(body !== undefined ? { data: body } : {}),
      } as RequestConfig & { url: string; method: string });

      const data = opts.schema ? opts.schema.parse(res.data) : (res.data as T);
      return { queued: false, data, correlationId };
    } catch (err) {
      const problem = normaliseError(err, correlationId);
      // Lost connectivity mid-flight (no HTTP response) → fall back to the queue.
      const networkLost = problem.status === 0 && (problem.type.includes('network') || problem.type.includes('timeout'));
      if (networkLost && canQueue) {
        const m = await opts.offline!.queue.enqueue({ endpoint: url, method, payload: body, sensitive, correlationId });
        return { queued: true, mutationId: m.id, correlationId };
      }
      throw report(problem, url);
    }
  }

  return {
    get,
    write,
    post: (url, body, opts) => write('POST', url, body, opts),
    put: (url, body, opts) => write('PUT', url, body, opts),
    patch: (url, body, opts) => write('PATCH', url, body, opts),
    del: (url, opts) => write('DELETE', url, undefined, opts),
  };
}
