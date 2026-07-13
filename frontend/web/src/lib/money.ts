/**
 * Money arithmetic. IEEE-754 binary floats can't represent most decimal
 * fractions exactly (0.1 + 0.2 !== 0.3), so naive `Math.round(n*100)/100`
 * mis-rounds exact half-cents — the canonical example $1.005 rounds to $1.00
 * instead of $1.01. Every monetary result must pass through roundMoney, which
 * rounds to whole cents using commercial rounding (half away from zero) with a
 * sub-cent epsilon that absorbs representation error without affecting any real
 * amount.
 *
 * This MUST stay identical to the backend's money.utils.ts so the register and
 * the server-issued receipt agree to the cent.
 */

// 1e-6 of a cent: far below any real money, far above float error for amounts
// under ~$10^7, so it only ever corrects the representation, never the value.
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
