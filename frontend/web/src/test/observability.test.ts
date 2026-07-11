import { describe, it, expect, vi } from 'vitest';
import { Telemetry, MemorySink } from '@/lib/observability/telemetry';
import { installErrorHandlers } from '@/lib/observability/install';
import { observeWebVitals } from '@/lib/observability/webVitals';
import { createApiClient, type HttpLike } from '@/lib/http/client';
import type { ApiError } from '@/lib/http/errors';
import type { ApiProblem } from '@/lib/contracts/types';

function setup() {
  const t = new Telemetry();
  const sink = new MemorySink();
  t.addSink(sink);
  return { t, sink };
}

describe('Telemetry', () => {
  it('stamps `at` and fans out to sinks', () => {
    const { t, sink } = setup();
    t.trackUserAction('checkout.completed', { total: 12 });
    expect(sink.events).toHaveLength(1);
    expect(sink.events[0]).toMatchObject({ type: 'user_action', action: 'checkout.completed' });
    expect(sink.events[0].at).toBeTruthy();
  });

  it('maps an ApiProblem into an api_failure event with correlation id', () => {
    const { t, sink } = setup();
    const problem: ApiProblem = { type: 'urn:storeflow:forbidden', title: 'No', status: 403, correlationId: 'c1' };
    t.trackApiFailure(problem, '/products');
    expect(sink.events[0]).toMatchObject({
      type: 'api_failure',
      status: 403,
      problemType: 'urn:storeflow:forbidden',
      endpoint: '/products',
      correlationId: 'c1',
    });
  });

  it('isolates a throwing sink from the rest', () => {
    const t = new Telemetry();
    const good = new MemorySink();
    t.addSink({ send: () => { throw new Error('bad sink'); } });
    t.addSink(good);
    expect(() => t.trackRouteChange('/a')).not.toThrow();
    expect(good.events).toHaveLength(1);
  });

  it('addSink returns a working unsubscribe', () => {
    const { t, sink } = setup();
    const stop = t.addSink(new MemorySink());
    stop();
    t.trackRouteChange('/x');
    expect(sink.events).toHaveLength(1); // only the original sink got it
  });
});

describe('installErrorHandlers', () => {
  it('reports uncaught errors and unhandled rejections', () => {
    const { t, sink } = setup();
    const uninstall = installErrorHandlers(t);

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', filename: 'a.js' }));
    // jsdom lacks PromiseRejectionEvent; emulate with a plain event carrying `reason`.
    const rej = new Event('unhandledrejection') as Event & { reason?: unknown };
    rej.reason = new Error('nope');
    window.dispatchEvent(rej);

    uninstall();
    const types = sink.events.map((e) => e.type);
    expect(types).toContain('js_error');
    expect(sink.events.filter((e) => e.type === 'js_error')).toHaveLength(2);
    // handlers removed after uninstall
    window.dispatchEvent(new ErrorEvent('error', { message: 'again' }));
    expect(sink.events.filter((e) => e.type === 'js_error')).toHaveLength(2);
  });
});

describe('observeWebVitals', () => {
  it('no-ops safely where PerformanceObserver is unavailable', () => {
    const onReport = vi.fn();
    const stop = observeWebVitals(onReport);
    expect(typeof stop).toBe('function');
    expect(() => stop()).not.toThrow();
  });
});

describe('apiClient onError → telemetry', () => {
  it('reports API failures through the injected onError hook', async () => {
    const { t, sink } = setup();
    const apiErr: ApiError = { code: 'SERVER', message: 'Boom', status: 500 };
    const http: HttpLike = { get: async () => Promise.reject(apiErr), request: async () => ({ data: {} }) };
    const client = createApiClient(http, { onError: (p, endpoint) => t.trackApiFailure(p, endpoint) });

    await expect(client.get('/x', (await import('zod')).z.object({}))).rejects.toBeTruthy();
    expect(sink.events[0]).toMatchObject({ type: 'api_failure', status: 500, endpoint: '/x' });
  });
});
