import { describe, it, expect } from 'vitest';
import { earn, redeemValue, pointsUsed, tierFor } from '@/features/customers/loyalty';
import { computeTotals } from '@/features/pos/cartStore';

describe('loyalty engine (SF-902)', () => {
  it('earns 1 pt per $1, floored', () => {
    expect(earn(15.9)).toBe(15);
    expect(earn(0)).toBe(0);
    expect(earn(-5)).toBe(0);
  });

  it('redeems in 100-pt blocks capped at the bill', () => {
    expect(redeemValue(240, 100)).toBe(10); // 2 blocks = $10
    expect(redeemValue(582, 100)).toBe(25); // 5 blocks = $25, under cap
    expect(redeemValue(582, 12)).toBe(12); // capped at bill
    expect(redeemValue(70, 100)).toBe(0); // below one block
  });

  it('computes points used from redeemed dollars', () => {
    expect(pointsUsed(25)).toBe(500);
    expect(pointsUsed(0)).toBe(0);
  });

  it('assigns tiers by threshold', () => {
    expect(tierFor(50)).toBe('Bronze');
    expect(tierFor(100)).toBe('Silver');
    expect(tierFor(500)).toBe('Gold');
  });
});

describe('cart totals (SF-502/504)', () => {
  const items = [{ id: 'p1', name: 'A', price: 10, qty: 2, emoji: '', image: '' }]; // subtotal 20

  it('applies 10% discount + tax, no customer', () => {
    const t = computeTotals({ items, customer: null, redeeming: false, discountRate: 0.1 });
    expect(t.subtotal).toBe(20);
    expect(t.discount).toBeCloseTo(2);
    expect(t.taxable).toBeCloseTo(18);
    expect(t.tax).toBeCloseTo(18 * 0.054);
    expect(t.pointsEarned).toBe(Math.floor(18 + 18 * 0.054));
  });

  it('redeems points when toggled for a customer', () => {
    const t = computeTotals({ items, customer: { id: 'c', name: 'X', points: 240 }, redeeming: true, discountRate: 0.1 });
    // afterDiscount = 18 -> 2 blocks = $10 redeem
    expect(t.redeem).toBe(10);
    expect(t.redeemPoints).toBe(200);
    expect(t.taxable).toBeCloseTo(8);
  });
});
