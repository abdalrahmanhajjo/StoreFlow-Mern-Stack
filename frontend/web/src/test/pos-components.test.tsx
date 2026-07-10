import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { StoreProfileProvider } from '@/config/StoreProfileContext';
import { ProductSearch } from '@/features/pos/ProductSearch';
import { BasketPanel } from '@/features/pos/BasketPanel';
import { ConfirmDialogHost, confirm } from '@/components/ui/ConfirmDialog';
import { getMockStore } from '@/mocks';
import type { BasketLine } from '@/lib/contracts/types';

const { profile, products } = getMockStore('supermarket');

function wrap(ui: ReactNode) {
  return render(
    <StoreProfileProvider profile={profile} role="cashier">
      {ui}
      <ConfirmDialogHost />
    </StoreProfileProvider>
  );
}

describe('ProductSearch', () => {
  it('filters by name and selects a result on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    wrap(<ProductSearch products={products} onSelect={onSelect} />);

    await user.type(screen.getByLabelText('Find a product'), 'milk');
    const option = await screen.findByRole('option', { name: /semi-skimmed milk/i });
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ sku: 'SM-MILK-2L' }));
  });

  it('selects immediately on an exact barcode + Enter (scanner path)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    wrap(<ProductSearch products={products} onSelect={onSelect} />);

    const input = screen.getByLabelText('Find a product');
    await user.type(input, '5000112637922{Enter}'); // milk barcode
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ sku: 'SM-MILK-2L' }));
  });

  it('shows an empty state for no matches', async () => {
    const user = userEvent.setup();
    wrap(<ProductSearch products={products} onSelect={vi.fn()} />);
    await user.type(screen.getByLabelText('Find a product'), 'zzzzz');
    expect(await screen.findByText(/No products match/i)).toBeInTheDocument();
  });
});

describe('BasketPanel', () => {
  const lines: BasketLine[] = [
    { productId: 'sm_1', name: 'Milk', unitPrice: 1.45, quantity: 2, unit: 'each', taxRate: 0.2 },
  ];

  it('renders locale-aware totals (VAT inclusive, GBP)', () => {
    wrap(<BasketPanel lines={lines} onQuantityChange={vi.fn()} onRemove={vi.fn()} onCheckout={vi.fn()} />);
    // 2 × £1.45 = £2.90 inclusive total → shown on the charge button
    expect(screen.getByRole('button', { name: /charge £2\.90/i })).toBeInTheDocument();
    expect(screen.getByText(/VAT/)).toBeInTheDocument();
    // VAT extracted from an inclusive £2.90 is £0.48
    expect(screen.getByText('£0.48')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    wrap(<BasketPanel lines={[]} onQuantityChange={vi.fn()} onRemove={vi.fn()} onCheckout={vi.fn()} />);
    expect(screen.getByText('Basket is empty')).toBeInTheDocument();
  });

  it('confirms before removing a line', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    wrap(<BasketPanel lines={lines} onQuantityChange={vi.fn()} onRemove={onRemove} onCheckout={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Remove Milk' }));
    // dialog appears
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/Remove item\?/);
    await user.click(screen.getByRole('button', { name: 'Remove' })); // exact = dialog confirm
    expect(onRemove).toHaveBeenCalledWith('sm_1');
  });

  it('checks out', async () => {
    const user = userEvent.setup();
    const onCheckout = vi.fn();
    wrap(<BasketPanel lines={lines} onQuantityChange={vi.fn()} onRemove={vi.fn()} onCheckout={onCheckout} />);
    await user.click(screen.getByRole('button', { name: /charge/i }));
    expect(onCheckout).toHaveBeenCalledOnce();
  });
});

describe('confirm() dialog', () => {
  it('resolves true on confirm and false on cancel', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);

    let p = confirm({ title: 'Proceed?' });
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await expect(p).resolves.toBe(true);

    p = confirm({ title: 'Proceed?' });
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(p).resolves.toBe(false);
  });

  it('resolves false when dismissed with Escape', async () => {
    const user = userEvent.setup();
    render(<ConfirmDialogHost />);
    const p = confirm({ title: 'Delete?', danger: true });
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await expect(p).resolves.toBe(false);
  });
});
