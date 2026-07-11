import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineQueuePanel } from '@/components/offline/OfflineQueuePanel';
import { OfflineQueue } from '@/lib/offline/queue';
import { MemoryMutationStore } from '@/lib/offline/store';

describe('OfflineQueuePanel', () => {
  it('shows queued records and syncs them via the manual control', async () => {
    const user = userEvent.setup();
    const queue = new OfflineQueue(new MemoryMutationStore());
    await queue.enqueue({ endpoint: '/api/sales', method: 'POST', payload: { total: 1 }, sensitive: false });
    const transport = vi.fn().mockResolvedValue(undefined);

    render(<OfflineQueuePanel queue={queue} transport={transport} autoSync={false} />);

    // queued badge visible
    await waitFor(() => expect(screen.getByText('Queued')).toBeInTheDocument());
    expect(screen.getByText(/pending change/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /sync now/i }));

    await waitFor(() => expect(transport).toHaveBeenCalledOnce());
    // after prune the list is empty and the success banner shows
    await waitFor(() => expect(screen.getByText('All changes synced')).toBeInTheDocument());
  });

  it('surfaces a failed record with an accessible error and a Retry control', async () => {
    const user = userEvent.setup();
    const queue = new OfflineQueue(new MemoryMutationStore());
    await queue.enqueue({ endpoint: '/api/sales', method: 'POST', payload: {}, sensitive: false });
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(undefined);

    render(<OfflineQueuePanel queue={queue} transport={transport} autoSync={false} />);

    const syncBtn = await screen.findByRole('button', { name: /sync now/i });
    await user.click(syncBtn);
    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('Server error');

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Synced')).toBeInTheDocument());
  });
});
