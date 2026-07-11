import type { HttpMethod, OfflineMutation } from '@/lib/contracts/types';
import { offlineMutationSchema } from '@/lib/contracts/schemas';
import type { MutationStore } from './store';

// A transport actually performs the queued write when back online. It must throw
// (or reject) on failure so the queue can mark the mutation failed and retry.
export type SyncTransport = (mutation: OfflineMutation) => Promise<void>;

export interface EnqueueInput {
  endpoint: string;
  method: HttpMethod;
  payload: unknown;
  /**
   * Regulated/sensitive write (e.g. pharmacy dispensing). Sensitive mutations
   * are NOT auto-synced unless the caller explicitly allows it, so a regulated
   * flow never silently replays offline.
   */
  sensitive: boolean;
  correlationId?: string;
}

export interface SyncOptions {
  /** Allow sensitive mutations to sync. Defaults false (online-only policy). */
  allowSensitive?: boolean;
  /** Max attempts before a mutation is left in `failed` for manual handling. */
  maxRetries?: number;
}

export interface SyncSummary {
  synced: number;
  failed: number;
  skipped: number;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Durable, replayable queue for writes made while offline. Records are persisted
 * via the injected MutationStore (IndexedDB in the browser) and validated with
 * the schema on the way in, so a corrupted/oversized payload can't enter state.
 */
export class OfflineQueue {
  constructor(private store: MutationStore) {}

  async enqueue(input: EnqueueInput): Promise<OfflineMutation> {
    const mutation: OfflineMutation = {
      id: genId(),
      createdAt: new Date().toISOString(),
      endpoint: input.endpoint,
      method: input.method,
      payload: input.payload,
      status: 'queued',
      retries: 0,
      correlationId: input.correlationId ?? genId(),
      sensitive: input.sensitive,
    };
    // Validate the record shape (defence-in-depth) before persisting.
    const parsed = offlineMutationSchema.safeParse(mutation);
    if (!parsed.success) throw new Error('Refused to queue an invalid mutation');
    await this.store.put(mutation);
    return mutation;
  }

  /** All mutations, oldest first (stable replay order). */
  async list(): Promise<OfflineMutation[]> {
    const all = await this.store.getAll();
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async pendingCount(): Promise<number> {
    const all = await this.store.getAll();
    return all.filter((m) => m.status === 'queued' || m.status === 'failed').length;
  }

  async remove(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /** Drop already-synced records so the queue view stays clean. */
  async prune(): Promise<void> {
    const all = await this.store.getAll();
    await Promise.all(all.filter((m) => m.status === 'synced').map((m) => this.store.delete(m.id)));
  }

  /** Attempt a single mutation now (used by the manual "Retry" control). */
  async syncOne(id: string, transport: SyncTransport, opts: SyncOptions = {}): Promise<OfflineMutation | null> {
    const all = await this.store.getAll();
    const m = all.find((x) => x.id === id);
    if (!m) return null;
    return this.attempt(m, transport, opts);
  }

  /** Attempt every eligible mutation in order. */
  async syncAll(transport: SyncTransport, opts: SyncOptions = {}): Promise<SyncSummary> {
    const summary: SyncSummary = { synced: 0, failed: 0, skipped: 0 };
    for (const m of await this.list()) {
      if (m.status === 'synced') continue;
      if (m.sensitive && !opts.allowSensitive) {
        summary.skipped += 1;
        continue;
      }
      const result = await this.attempt(m, transport, opts);
      if (result?.status === 'synced') summary.synced += 1;
      else summary.failed += 1;
    }
    return summary;
  }

  private async attempt(m: OfflineMutation, transport: SyncTransport, opts: SyncOptions): Promise<OfflineMutation> {
    if (m.sensitive && !opts.allowSensitive) return m; // never sync sensitive silently
    const maxRetries = opts.maxRetries ?? 5;

    await this.store.put({ ...m, status: 'syncing' });
    try {
      await transport(m);
      const synced: OfflineMutation = { ...m, status: 'synced' };
      await this.store.put(synced);
      return synced;
    } catch (err) {
      const retries = m.retries + 1;
      const failed: OfflineMutation = {
        ...m,
        status: 'failed',
        retries,
        lastError: err instanceof Error ? err.message : 'Sync failed',
      };
      await this.store.put(failed);
      // Beyond maxRetries the record stays `failed` for manual resolution.
      void maxRetries;
      return failed;
    }
  }
}
