import { describe, it, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { createApiClient, type HttpLike, CORRELATION_HEADER, IDEMPOTENCY_HEADER } from '@/lib/http/client';
import { OfflineQueue } from '@/lib/offline/queue';
import { MemoryMutationStore } from '@/lib/offline/store';
import type { ApiError } from '@/lib/http/errors';

const productSchema = z.object({ id: z.string(), name: z.string() });

function fakeHttp(over: Partial<HttpLike> = {}): HttpLike & { calls: { config: unknown }[] } {
  const calls: { config: unknown }[] = [];
  return {
    calls,
    get: over.get ?? (async () => ({ data: {} })),
    request:
      over.request ??
      (async (config) => {
        calls.push({ config });
        return { data: {} };
      }),
  };
}

function setOnline(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value);
}

afterEach(() => vi.restoreAllMocks());

describe('apiClient.get', () => {
  it('parses a valid response through the schema', async () => {
    const http = fakeHttp({ get: async () => ({ data: { id: '1', name: 'Milk' } }) });
    const client = createApiClient(http);
    await expect(client.get('/products/1', productSchema)).resolves.toEqual({ id: '1', name: 'Milk' });
  });

  it('throws an ApiProblem (502) when the response fails validation', async () => {
    const http = fakeHttp({ get: async () => ({ data: { id: 1 } }) }); // id should be string
    const client = createApiClient(http);
    await expect(client.get('/products/1', productSchema)).rejects.toMatchObject({
      status: 502,
      type: 'urn:storeflow:invalid-response',
    });
  });

  it('normalises an interceptor ApiError into an ApiProblem with correlationId', async () => {
    const apiErr: ApiError = { code: 'FORBIDDEN', message: 'Nope', status: 403 };
    const http = fakeHttp({ get: async () => Promise.reject(apiErr) });
    const client = createApiClient(http);
    await expect(client.get('/x', productSchema)).rejects.toMatchObject({
      status: 403,
      title: 'Nope',
      correlationId: expect.any(String),
    });
  });

  it('stamps the request with a correlation id header', async () => {
    let seen: Record<string, string> | undefined;
    const http = fakeHttp({
      get: async (_url, config) => {
        seen = config?.headers;
        return { data: { id: '1', name: 'x' } };
      },
    });
    await createApiClient(http).get('/products/1', productSchema);
    expect(seen?.[CORRELATION_HEADER]).toBeTruthy();
  });
});

describe('apiClient.write — online', () => {
  it('posts and returns parsed data + correlation id, with an idempotency key', async () => {
    setOnline(true);
    const http = fakeHttp({ request: async () => ({ data: { id: '9', name: 'New' } }) });
    const spy = vi.spyOn(http, 'request');
    const client = createApiClient(http);
    const res = await client.post('/products', { name: 'New' }, { schema: productSchema });
    expect(res).toMatchObject({ queued: false, data: { id: '9', name: 'New' } });
    const cfg = spy.mock.calls[0][0] as { headers: Record<string, string> };
    expect(cfg.headers[CORRELATION_HEADER]).toBeTruthy();
    expect(cfg.headers[IDEMPOTENCY_HEADER]).toBe(cfg.headers[CORRELATION_HEADER]);
  });
});

describe('apiClient.write — offline routing', () => {
  const queueOf = () => new OfflineQueue(new MemoryMutationStore());

  it('queues a non-sensitive write when offline', async () => {
    setOnline(false);
    const queue = queueOf();
    const http = fakeHttp();
    const requestSpy = vi.spyOn(http, 'request');
    const client = createApiClient(http);

    const res = await client.post('/sales', { total: 5 }, { offline: { queue, sensitive: false } });
    expect(res.queued).toBe(true);
    expect(requestSpy).not.toHaveBeenCalled(); // never hit the network
    expect(await queue.pendingCount()).toBe(1);
  });

  it('refuses (does not queue) a sensitive write offline without opt-in', async () => {
    setOnline(false);
    const queue = queueOf();
    const client = createApiClient(fakeHttp());
    await expect(
      client.post('/dispense', { rx: 1 }, { offline: { queue, sensitive: true } })
    ).rejects.toMatchObject({ type: 'urn:storeflow:offline-regulated-blocked' });
    expect(await queue.pendingCount()).toBe(0);
  });

  it('queues a sensitive write offline when explicitly allowed', async () => {
    setOnline(false);
    const queue = queueOf();
    const client = createApiClient(fakeHttp());
    const res = await client.post('/dispense', { rx: 1 }, { offline: { queue, sensitive: true, allowSensitive: true } });
    expect(res.queued).toBe(true);
    expect(await queue.pendingCount()).toBe(1);
  });

  it('falls back to the queue when connectivity is lost mid-request', async () => {
    setOnline(true); // appears online, but the request fails with a network error
    const queue = queueOf();
    const networkErr: ApiError = { code: 'NETWORK', message: 'Network error' };
    const http = fakeHttp({ request: async () => Promise.reject(networkErr) });
    const client = createApiClient(http);
    const res = await client.post('/sales', { total: 1 }, { offline: { queue, sensitive: false } });
    expect(res.queued).toBe(true);
    expect(await queue.pendingCount()).toBe(1);
  });

  it('rethrows a real server error (does not queue) on a 4xx/5xx with a response', async () => {
    setOnline(true);
    const queue = queueOf();
    const serverErr: ApiError = { code: 'SERVER', message: 'Boom', status: 500 };
    const http = fakeHttp({ request: async () => Promise.reject(serverErr) });
    const client = createApiClient(http);
    await expect(client.post('/sales', {}, { offline: { queue, sensitive: false } })).rejects.toMatchObject({ status: 500 });
    expect(await queue.pendingCount()).toBe(0);
  });
});
