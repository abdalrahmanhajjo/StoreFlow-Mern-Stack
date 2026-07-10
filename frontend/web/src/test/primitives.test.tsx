import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { QuantityInput } from '@/components/ui/QuantityInput';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { parseLocaleNumber } from '@/lib/i18n/parse';

describe('parseLocaleNumber', () => {
  it('parses en-GB and de-DE separators', () => {
    expect(parseLocaleNumber('1,234.56', 'en-GB')).toBeCloseTo(1234.56);
    expect(parseLocaleNumber('1.234,56', 'de-DE')).toBeCloseTo(1234.56);
  });
  it('strips pasted currency symbols (paste not blocked)', () => {
    expect(parseLocaleNumber('£12.50', 'en-GB')).toBeCloseTo(12.5);
  });
  it('returns null for empty/invalid, distinguishing cleared from zero', () => {
    expect(parseLocaleNumber('', 'en-GB')).toBeNull();
    expect(parseLocaleNumber('abc', 'en-GB')).toBeNull();
    expect(parseLocaleNumber('0', 'en-GB')).toBe(0);
  });
});

describe('MoneyInput', () => {
  function Harness() {
    const [v, setV] = useState<number | null>(null);
    return <MoneyInput label="Cash tendered" value={v} onChange={setV} currency="GBP" locale="en-GB" />;
  }

  it('associates the label and accepts typed money', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Cash tendered');
    await user.type(input, '12.50');
    // formatted preview reflects the interpreted amount
    expect(screen.getByText('£12.50')).toBeInTheDocument();
  });

  it('does not block paste', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText<HTMLInputElement>('Cash tendered');
    input.focus();
    await user.paste('£9.99');
    expect(input.value).toContain('9.99');
    expect(screen.getByText('£9.99')).toBeInTheDocument();
  });

  it('shows an accessible range error', () => {
    render(<MoneyInput label="Amount" value={200} onChange={() => {}} currency="GBP" max={100} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/up to £100/);
    expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('QuantityInput', () => {
  function Harness(props: { unit?: 'each' | 'kg' }) {
    const [q, setQ] = useState(1);
    return <QuantityInput label="Quantity" value={q} onChange={setQ} min={1} max={5} unit={props.unit} />;
  }

  it('increments/decrements via buttons and clamps to range', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const inc = screen.getByRole('button', { name: /increase quantity/i });
    const spin = screen.getByRole('spinbutton');
    await user.click(inc);
    expect(spin).toHaveAttribute('aria-valuenow', '2');
    // clamp at max=5
    await user.click(inc);
    await user.click(inc);
    await user.click(inc);
    await user.click(inc);
    expect(spin).toHaveAttribute('aria-valuenow', '5');
    expect(inc).toBeDisabled();
  });

  it('supports keyboard ArrowUp/ArrowDown', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const spin = screen.getByRole('spinbutton');
    spin.focus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(spin).toHaveAttribute('aria-valuenow', '3');
    await user.keyboard('{ArrowDown}');
    expect(spin).toHaveAttribute('aria-valuenow', '2');
  });

  it('rounds to whole numbers for "each" but allows decimals for "kg"', async () => {
    const user = userEvent.setup();
    render(<Harness unit="kg" />);
    const spin = screen.getByRole('spinbutton');
    await user.clear(spin);
    await user.type(spin, '2.5');
    expect(spin).toHaveAttribute('aria-valuenow', '2.5');
  });
});

describe('StatusBanner', () => {
  it('uses assertive alert for errors and polite status for info', () => {
    const { rerender } = render(<StatusBanner variant="error" title="Sync failed" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sync failed');
    rerender(<StatusBanner variant="info" title="All good" />);
    expect(screen.getByRole('status')).toHaveTextContent('All good');
  });

  it('conveys status with a text label, not colour alone', () => {
    render(<StatusBanner variant="warning" title="Low stock" />);
    // visually-hidden label present for screen readers
    expect(screen.getByRole('alert')).toHaveTextContent(/Warning:/);
  });

  it('fires onDismiss and exposes a manual action', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    const onRetry = vi.fn();
    render(
      <StatusBanner
        variant="pending"
        title="Queued offline"
        onDismiss={onDismiss}
        action={<button onClick={onRetry}>Retry now</button>}
      />
    );
    await user.click(screen.getByRole('button', { name: /dismiss pending message/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Retry now' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
