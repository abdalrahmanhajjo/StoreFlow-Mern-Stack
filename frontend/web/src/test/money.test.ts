import { describe, it, expect } from 'vitest';
import { roundMoney, lineAmount } from '@/lib/money';
import { computeTotals } from '@/features/pos/cartStore';

describe('roundMoney — commercial rounding, IEEE-754 safe', () => {
  it('rounds exact half-cents away from zero (the $1.005 bug)', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(0.005)).toBe(0.01);
    expect(roundMoney(-1.005)).toBe(-1.01);
  });

  it('absorbs float representation error', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(19.99 * 1.0825)).toBe(21.64);
    expect(roundMoney(0)).toBe(0);
  });

  it('leaves already-clean cents unchanged', () => {
    expect(roundMoney(10)).toBe(10);
    expect(roundMoney(3.33)).toBe(3.33);
    expect(roundMoney(999999.99)).toBe(999999.99);
  });

  it('lineAmount rounds price × qty to cents', () => {
    expect(lineAmount(0.333, 3)).toBe(1); // 0.999 → 1.00
    expect(lineAmount(19.99, 3)).toBe(59.97);
  });

  it('sums of rounded lines never drift', () => {
    // 3 lines of $0.10 at a rate that would drift with raw floats
    const total = roundMoney([0.1, 0.1, 0.1].reduce((s, n) => s + n, 0));
    expect(total).toBe(0.3);
  });
});

describe('computeTotals produces clean cent amounts', () => {
  const line = (price: number, qty: number) => ({ id: 'x', name: 'x', sku: 'x', price, qty, emoji: '', image: '' });

  it('taxes to whole cents, not a raw float', () => {
    const t = computeTotals({
      items: [line(19.99, 1)],
      customer: null, redeeming: false,
      discountMode: 'percent', discountRate: 0, discountFixed: 0,
      taxRate: 0.0825,
    });
    expect(t.subtotal).toBe(19.99);
    expect(t.tax).toBe(1.65); // 19.99 * 0.0825 = 1.649175 → 1.65
    expect(t.total).toBe(21.64);
    // every field is already at whole cents — rounding again is a no-op
    for (const v of [t.subtotal, t.discount, t.tax, t.total]) {
      expect(roundMoney(v)).toBe(v);
    }
  });
});
