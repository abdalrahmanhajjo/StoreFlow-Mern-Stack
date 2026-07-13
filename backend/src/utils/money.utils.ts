/**
 * Money arithmetic. IEEE-754 binary floats can't represent most decimal
 * fractions exactly (0.1 + 0.2 !== 0.3), so a sale computed with raw floats
 * stores totals like 21.639174999999998 and mis-rounds exact half-cents.
 * Every monetary result the API persists or returns must pass through
 * roundMoney, which rounds to whole cents using commercial rounding (half away
 * from zero) with a sub-cent epsilon that absorbs representation error.
 *
 * MUST stay identical to the frontend's lib/money.ts so the register and the
 * server-issued receipt agree to the cent.
 */

const EPSILON = 1e-6;

/** Round a dollar amount to whole cents (half away from zero). */
export function roundMoney(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  const cents = Math.round(dollars * 100 + (dollars >= 0 ? EPSILON : -EPSILON));
  return cents / 100;
}

/** A single line's amount: unit price × quantity, rounded to cents. */
export function lineAmount(unitPrice: number, quantity: number): number {
  return roundMoney(unitPrice * quantity);
}
