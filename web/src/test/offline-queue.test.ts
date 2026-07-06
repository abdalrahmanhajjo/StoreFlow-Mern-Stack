import { describe, it, expect, vi } from 'vitest';
import { OfflineQueue } from '@/lib/offline/queue';
import { MemoryMutationStore } from '@/lib/offline/store';

function makeQueue() {
  return new OfflineQueue(new MemoryMutationStore());
}
const write = { endpoint: '/api/sales', method: 'POST' as const, payload: { total: 12 }, sensitive: false };

describe('OfflineQueue.enqueue', () => {
  it('persists a queued mutation with generated id + correlationId', async () => {
    const q = makeQueue();
    const m = await q.enqueue(write);
    expect(m.status).toBe('queued');
    expect(m.id).toBeTruthy();
    expect(m.correlationId).toBeTruthy();
    expect(await q.pendingCount()).toBe(1);
  });

  it('lists mutations oldest-first', async () => {
    const q = makeQueue();
    const a = await q.enqueue({ ...write, payload: { n: 1 } });
    await new Promise((r) => setTimeout(r, 2));
    const b = await q.enqueue({ ...write, payload: { n: 2 } });
    const list = await q.list();
    expect(list.map((m) => m.id)).toEqual([a.id, b.id]);
  });
});

describe('OfflineQueue.syncAll', () => {
  it('marks mutations synced when the transport succeeds', async () => {
    const q = makeQueue();
    await q.enqueue(write);
    const transport = vi.fn().mockResolvedValue(undefined);
    const summary = await q.syncAll(transport);
    expect(summary).toMatchObject({ synced: 1, failed: 0, skipped: 0 });
    expect(transport).toHaveBeenCalledOnce();
    // synced records are still present until pruned
    expect((await q.list())[0].status).toBe('synced');
    await q.prune();
    expect(await q.list()).toHaveLength(0);
  });

  it('marks failed and records lastError + retries on transport failure', async () => {
    const q = makeQueue();
    const m = await q.enqueue(write);
    const transport = vi.fn().mockRejectedValue(new Error('503 unavailable'));
    const summary = await q.syncAll(transport);
    expect(summary).toMatchObject({ synced: 0, failed: 1 });
    const after = (await q.list()).find((x) => x.id === m.id)!;
    expect(after.status).toBe('failed');
    expect(after.retries).toBe(1);
    expect(after.lastError).toBe('503 unavailable');
  });

  it('retries a previously failed mutation and can succeed', async () => {
    const q = makeQueue();
    const m = await q.enqueue(write);
    const transport = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    await q.syncAll(transport); // fails
    await q.syncOne(m.id, transport); // succeeds
    expect((await q.list())[0].status).toBe('synced');
    expect(transport).toHaveBeenCalledTimes(2);
  });
});

describe('sensitive / regulated gating', () => {
  const sensitive = { ...write, endpoint: '/api/dispense', sensitive: true };

  it('never syncs a sensitive mutation without an explicit opt-in', async () => {
    const q = makeQueue();
    await q.enqueue(sensitive);
    const transport = vi.fn().mockResolvedValue(undefined);
    const summary = await q.syncAll(transport);
    expect(transport).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ synced: 0, skipped: 1 });
    expect((await q.list())[0].status).toBe('queued'); // left untouched
  });

  it('syncs a sensitive mutation when allowSensitive is set', async () => {
    const q = makeQueue();
    await q.enqueue(sensitive);
    const transport = vi.fn().mockResolvedValue(undefined);
    const summary = await q.syncAll(transport, { allowSensitive: true });
    expect(transport).toHaveBeenCalledOnce();
    expect(summary.synced).toBe(1);
  });
});

describe('remove', () => {
  it('drops a queued mutation', async () => {
    const q = makeQueue();
    const m = await q.enqueue(write);
    await q.remove(m.id);
    expect(await q.list()).toHaveLength(0);
  });
});
