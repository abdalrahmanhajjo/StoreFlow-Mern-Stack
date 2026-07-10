import type { BasketLine, TaxProfile } from '@/lib/contracts/types';

export interface BasketTotals {
  subtotal: number; // sum of line nets before tax adjustments (exclusive) / incl for inclusive
  discountTotal: number;
  taxTotal: number;
  total: number;
  itemCount: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute basket totals honouring the store's tax model.
 * - inclusive: line prices already contain tax; `total` equals the summed line
 *   amounts and `taxTotal` is the extracted tax portion.
 * - exclusive: tax is added on top of the summed line amounts.
 * A line may override the store rate via `line.taxRate`.
 */
export function computeBasketTotals(lines: BasketLine[], tax: TaxProfile): BasketTotals {
  let gross = 0; // sum of line amounts as priced
  let discountTotal = 0;
  let taxTotal = 0;
  let itemCount = 0;

  for (const line of lines) {
    const rate = line.taxRate ?? tax.defaultRate;
    const listAmount = line.unitPrice * line.quantity;
    const discount = listAmount * (line.lineDiscount ?? 0);
    const lineAmount = listAmount - discount;

    discountTotal += discount;
    gross += lineAmount;
    itemCount += line.quantity;

    if (tax.inclusive) {
      // Extract the tax already baked into the price.
      taxTotal += lineAmount - lineAmount / (1 + rate);
    } else {
      taxTotal += lineAmount * rate;
    }
  }

  const total = tax.inclusive ? gross : gross + taxTotal;
  return {
    subtotal: round2(tax.inclusive ? gross - taxTotal : gross),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    total: round2(total),
    itemCount,
  };
}
