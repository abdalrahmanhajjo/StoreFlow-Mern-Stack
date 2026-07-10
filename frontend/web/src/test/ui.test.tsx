import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable, TierBadge, tierFor } from '@/components/ui';
import type { Column } from '@/components/ui';

describe('design system', () => {
  it('tierFor thresholds', () => {
    expect(tierFor(50)).toBe('Bronze');
    expect(tierFor(100)).toBe('Silver');
    expect(tierFor(500)).toBe('Gold');
  });

  it('TierBadge renders label', () => {
    render(<TierBadge tier="Gold" />);
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });

  it('DataTable shows empty state', () => {
    const cols: Column<{ id: string }>[] = [{ key: 'id', header: 'ID' }];
    render(<DataTable columns={cols} data={[]} rowKey={(r) => r.id} emptyText="No rows" />);
    expect(screen.getByText('No rows')).toBeInTheDocument();
  });
});
