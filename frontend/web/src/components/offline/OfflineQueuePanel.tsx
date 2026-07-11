import { StatusBanner } from '@/components/ui/StatusBanner';
import { Button } from '@/components/ui/Button';
import { useOfflineQueue, type UseOfflineQueueOptions } from '@/hooks/useOfflineQueue';
import type { OfflineMutationStatus } from '@/lib/contracts/types';

const STATUS_LABEL: Record<OfflineMutationStatus, { text: string; bg: string; fg: string }> = {
  queued: { text: 'Queued', bg: 'var(--paper-dim)', fg: 'var(--ink-soft)' },
  syncing: { text: 'Syncing…', bg: 'var(--blue-soft)', fg: 'var(--blue-deep)' },
  synced: { text: 'Synced', bg: 'var(--green-soft)', fg: 'var(--green-deep)' },
  failed: { text: 'Failed', bg: 'var(--red-soft)', fg: 'var(--red-deep)' },
};

// Shows the offline write queue with clear queued/synced markers and a manual
// retry per record (used when background sync is unavailable). Status is a text
// badge, not colour alone.
export function OfflineQueuePanel(options: UseOfflineQueueOptions = {}) {
  const { online, syncing, mutations, pending, retry, syncNow, remove } = useOfflineQueue(options);

  return (
    <section aria-labelledby="queue-heading">
      <h2 id="queue-heading" className="display" style={{ fontSize: 18, color: 'var(--ink)', margin: '0 0 10px' }}>
        Offline queue
      </h2>

      {!online && (
        <StatusBanner variant="warning" title="You are offline">
          {pending === 1 ? '1 change is queued' : `${pending} changes are queued`} and will sync automatically when you
          reconnect.
        </StatusBanner>
      )}
      {online && pending > 0 && (
        <StatusBanner
          variant="pending"
          title={`${pending} pending ${pending === 1 ? 'change' : 'changes'}`}
          action={
            <Button size="sm" onClick={() => void syncNow()} isLoading={syncing}>
              Sync now
            </Button>
          }
        >
          Background sync may be unavailable — you can push these manually.
        </StatusBanner>
      )}
      {mutations.length === 0 && (
        <StatusBanner variant="success" title="All changes synced">
          Nothing is waiting to upload.
        </StatusBanner>
      )}

      {mutations.length > 0 && (
        <ul aria-label="Queued changes" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mutations.map((m) => {
            const badge = STATUS_LABEL[m.status];
            return (
              <li
                key={m.id}
                style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.fg }}>
                  {badge.text}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span className="mono">{m.method}</span> {m.endpoint}
                  {m.sensitive && <span style={{ marginInlineStart: 8, fontSize: 11, color: 'var(--amber)' }}>sensitive</span>}
                </span>
                {m.status === 'failed' && (
                  <>
                    <span role="alert" style={{ fontSize: 12, color: 'var(--red)' }}>{m.lastError ?? 'Sync failed'}</span>
                    <Button size="sm" variant="ghost" onClick={() => void retry(m.id)} disabled={syncing}>
                      Retry
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => void remove(m.id)} aria-label={`Remove queued ${m.method} ${m.endpoint}`}>
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
