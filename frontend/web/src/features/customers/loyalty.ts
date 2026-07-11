// SF-902: pure loyalty engine. No React, no side effects — fully unit-tested.
import type { Tier } from '@/components/ui';

export const POINTS_PER_DOLLAR = 1; // earn 1 pt per $1 of final total
export const POINTS_BLOCK = 100; // redeem in blocks of 100 pts
export const BLOCK_VALUE = 2; // 100 pts = $2 off

/** Points earned on a completed sale total. */
export function earn(total: number): number {
  if (total <= 0) return 0;
  return Math.floor(total * POINTS_PER_DOLLAR);
}

/** Dollar discount a customer can redeem, capped at the bill amount. */
export function redeemValue(availablePoints: number, maxCap: number): number {
  const blocks = Math.floor(availablePoints / POINTS_BLOCK);
  const dollars = blocks * BLOCK_VALUE;
  return Math.min(dollars, Math.max(0, maxCap));
}

/** How many points a given redeemed-dollar amount consumes. */
export function pointsUsed(redeemDollars: number): number {
  return Math.round((redeemDollars / BLOCK_VALUE) * POINTS_BLOCK);
}

/** Loyalty tier from a points balance. */
export function tierFor(points: number): Tier {
  if (points >= 500) return 'Gold';
  if (points >= 100) return 'Silver';
  return 'Bronze';
}
