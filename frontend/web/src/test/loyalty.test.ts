import { describe, it, expect } from 'vitest';
import { earn, redeemValue, pointsUsed, tierFor } from '@/features/customers/loyalty';
import { computeTotals, maxPctForRole, maxFixedForRole } from '@/features/pos/cartStore';

describe('loyalty engine (SF-902)', () => {
  it('earns 1 pt per $1, floored', () => {
    expect(earn(15.9)).toBe(15);
    expect(earn(0)).toBe(0);
    expect(earn(-5)).toBe(0);
  });

  it('redeems in 100-pt blocks capped at the bill', () => {
    expect(redeemValue(240, 100)).toBe(4);  // 2 blocks × $2 = $4
    expect(redeemValue(582, 100)).toBe(10); // 5 blocks × $2 = $10, under cap
    expect(redeemValue(582, 8)).toBe(8);    // capped at bill
    expect(redeemValue(70, 100)).toBe(0);   // below one block
  });

  it('computes points used from redeemed dollars', () => {
    expect(pointsUsed(4)).toBe(200);   // $4 = 200 pts at $2/100-pt-block
    expect(pointsUsed(10)).toBe(500);  // $10 = 500 pts
    expect(pointsUsed(0)).toBe(0);
  });

  it('assigns tiers by threshold', () => {
    expect(tierFor(50)).toBe('Bronze');
    expect(tierFor(100)).toBe('Silver');
    expect(tierFor(500)).toBe('Gold');
  });
});

describe('cart totals (SF-502/504)', () => {
  const items = [{ id: 'p1', name: 'A', sku: 'SKU001', price: 10, qty: 2, emoji: '', image: '' }]; // subtotal 20

  it('applies 10% discount + tax, no customer', () => {
    const t = computeTotals({ items, customer: null, redeeming: false, discountMode: 'percent', discountRate: 0.1, discountFixed: 0 });
    expect(t.subtotal).toBe(20);
    expect(t.discount).toBe(2);
    expect(t.taxable).toBe(18);
    expect(t.tax).toBe(0.97);
    expect(t.total).toBe(18.97);
    expect(t.pointsEarned).toBe(18);
  });

  it('redeems points when toggled for a customer', () => {
    const t = computeTotals({ items, customer: { id: 'c', name: 'X', points: 240 }, redeeming: true, discountMode: 'percent', discountRate: 0.1, discountFixed: 0 });
    expect(t.redeem).toBe(4);
    expect(t.redeemPoints).toBe(200);
    expect(t.taxable).toBe(14);
    expect(t.tax).toBe(0.76);
    expect(t.total).toBe(14.76);
  });

  it('applies fixed-dollar discount capped at subtotal', () => {
    const t = computeTotals({ items, customer: null, redeeming: false, discountMode: 'fixed', discountRate: 0, discountFixed: 3 });
    expect(t.subtotal).toBe(20);
    expect(t.discount).toBe(3);
    expect(t.taxable).toBe(17);
    expect(t.tax).toBe(0.92); // round2(17 * 0.054)
    expect(t.total).toBe(17.92);
  });

  it('clamps fixed discount to subtotal', () => {
    const t = computeTotals({ items, customer: null, redeeming: false, discountMode: 'fixed', discountRate: 0, discountFixed: 99 });
    expect(t.discount).toBe(20); // capped at subtotal
    expect(t.taxable).toBe(0);
    expect(t.total).toBe(0);
  });
});

describe('role-based discount caps (SF-504b)', () => {
  it('returns role-appropriate percent caps', () => {
    expect(maxPctForRole('platform_admin')).toBe(1);
    expect(maxPctForRole('owner')).toBe(0.5);
    expect(maxPctForRole('manager')).toBe(0.35);
    expect(maxPctForRole('cashier')).toBe(0.25);
    expect(maxPctForRole(null)).toBe(0.25); // fallback to cashier
  });

  it('returns role-appropriate fixed-dollar caps', () => {
    expect(maxFixedForRole('platform_admin')).toBe(Infinity);
    expect(maxFixedForRole('owner')).toBe(500);
    expect(maxFixedForRole('manager')).toBe(200);
    expect(maxFixedForRole('cashier')).toBe(100);
    expect(maxFixedForRole(null)).toBe(100);
  });
});
