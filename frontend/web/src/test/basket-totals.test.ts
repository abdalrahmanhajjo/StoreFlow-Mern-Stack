import { describe, it, expect } from 'vitest';
import { computeBasketTotals } from '@/features/pos/basketTotals';
import type { BasketLine, TaxProfile } from '@/lib/contracts/types';

const line = (over: Partial<BasketLine> = {}): BasketLine => ({
  productId: 'p1',
  name: 'Item',
  unitPrice: 10,
  quantity: 1,
  unit: 'each',
  taxRate: 0.2,
  ...over,
});

const exclusive: TaxProfile = { inclusive: false, defaultRate: 0.2, label: 'Sales Tax' };
const inclusive: TaxProfile = { inclusive: true, defaultRate: 0.2, label: 'VAT' };

describe('computeBasketTotals — exclusive tax', () => {
  it('adds tax on top of the net subtotal', () => {
    const t = computeBasketTotals([line({ unitPrice: 10, quantity: 2 })], exclusive);
    expect(t.subtotal).toBe(20);
    expect(t.taxTotal).toBe(4); // 20% of 20
    expect(t.total).toBe(24);
    expect(t.itemCount).toBe(2);
  });

  it('applies per-line discounts before tax', () => {
    const t = computeBasketTotals([line({ unitPrice: 100, quantity: 1, lineDiscount: 0.1 })], exclusive);
    expect(t.discountTotal).toBe(10);
    expect(t.subtotal).toBe(90);
    expect(t.taxTotal).toBe(18);
    expect(t.total).toBe(108);
  });
});

describe('computeBasketTotals — inclusive tax', () => {
  it('extracts the tax already contained in the price', () => {
    const t = computeBasketTotals([line({ unitPrice: 12, quantity: 1, taxRate: 0.2 })], inclusive);
    expect(t.total).toBe(12); // price is the total
    expect(t.taxTotal).toBe(2); // 12 - 12/1.2 = 2
    expect(t.subtotal).toBe(10);
  });
});

describe('computeBasketTotals — mixed rates + defaults', () => {
  it('uses the line rate when present and the store default otherwise', () => {
    const lines = [line({ unitPrice: 10, quantity: 1, taxRate: 0 }), line({ productId: 'p2', unitPrice: 10, quantity: 1, taxRate: undefined })];
    const t = computeBasketTotals(lines, exclusive);
    // first line 0% tax, second line default 20%
    expect(t.taxTotal).toBe(2);
    expect(t.total).toBe(22);
  });

  it('handles an empty basket', () => {
    const t = computeBasketTotals([], exclusive);
    expect(t).toMatchObject({ subtotal: 0, taxTotal: 0, total: 0, itemCount: 0 });
  });
});
