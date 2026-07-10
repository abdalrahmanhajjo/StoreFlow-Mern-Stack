import { useCallback, useEffect, useRef, useState } from 'react';
import type { OfflineMutation } from '@/lib/contracts/types';
import { OfflineQueue, type EnqueueInput, type SyncTransport } from '@/lib/offline/queue';
import { createMutationStore } from '@/lib/offline/store';
import { telemetry } from '@/lib/observability/telemetry';

// One durable queue per tab, backed by IndexedDB where available.
const defaultQueue = new OfflineQueue(createMutationStore());

export interface UseOfflineQueueOptions {
  /** Inject a queue (tests) — defaults to the shared IndexedDB-backed one. */
  queue?: OfflineQueue;
  /** How queued writes are replayed. Without it, only manual state is exposed. */
  transport?: SyncTransport;
  /** Permit sensitive/regulated mutations to sync (default false). */
  allowSensitive?: boolean;
  /** Auto-sync when the connection returns (default true when a transport is given). */
  autoSync?: boolean;
}

export interface UseOfflineQueue {
  online: boolean;
  syncing: boolean;
  mutations: OfflineMutation[];
  pending: number;
  enqueue: (input: EnqueueInput) => Promise<OfflineMutation>;
  retry: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  prune: () => Promise<void>;
}

function readOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function useOfflineQueue(options: UseOfflineQueueOptions = {}): UseOfflineQueue {
  const { queue = defaultQueue, transport, allowSensitive = false, autoSync = true } = options;
  const [online, setOnline] = useState(readOnline);
  const [syncing, setSyncing] = useState(false);
  const [mutations, setMutations] = useState<OfflineMutation[]>([]);
  // Keep the latest transport in a ref so connectivity/auto-sync effects don't
  // need it in their dependency arrays. Updated in an effect (never during render).
  const transportRef = useRef(transport);
  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);

  const refresh = useCallback(async () => {
    setMutations(await queue.list());
  }, [queue]);

  const syncNow = useCallback(async () => {
    if (!transportRef.current) return;
    setSyncing(true);
    try {
      const summary = await queue.syncAll(transportRef.current, { allowSensitive });
      if (summary.failed > 0) telemetry.trackQueueSyncFailure(summary.failed);
      await queue.prune();
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [queue, allowSensitive, refresh]);

  const enqueue = useCallback(
    async (input: EnqueueInput) => {
      const m = await queue.enqueue(input);
      await refresh();
      return m;
    },
    [queue, refresh]
  );

  const retry = useCallback(
    async (id: string) => {
      if (!transportRef.current) return;
      setSyncing(true);
      try {
        await queue.syncOne(id, transportRef.current, { allowSensitive });
      } finally {
        setSyncing(false);
        await refresh();
      }
    },
    [queue, allowSensitive, refresh]
  );

  const remove = useCallback(async (id: string) => { await queue.remove(id); await refresh(); }, [queue, refresh]);
  const prune = useCallback(async () => { await queue.prune(); await refresh(); }, [queue, refresh]);

  // Initial load.
  useEffect(() => { void refresh(); }, [refresh]);

  // Track connectivity; auto-sync on reconnect when a transport is available.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      if (autoSync && transportRef.current) void syncNow();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [autoSync, syncNow]);

  const pending = mutations.filter((m) => m.status === 'queued' || m.status === 'failed').length;

  return { online, syncing, mutations, pending, enqueue, retry, syncNow, remove, prune };
}
