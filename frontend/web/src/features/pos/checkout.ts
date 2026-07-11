import { useCart, computeTotals } from './cartStore';
import { useProducts } from '@/features/products/productsStore';
import { useCustomers } from '@/features/customers/customersStore';
import { useSales, nextInvoiceNo, type Sale } from '@/features/sales/salesStore';

export type CheckoutResult =
  | { ok: true; sale: Sale }
  | { ok: false; error: string };

// SF-503: validate stock, then atomically create invoice + decrement stock + award/redeem points.
export function completeSale(cashierName: string): CheckoutResult {
  const cart = useCart.getState();
  if (cart.items.length === 0) return { ok: false, error: 'Add at least one item before checking out' };

  // Availability re-check (prevent overselling)
  const catalog = useProducts.getState().products;
  for (const item of cart.items) {
    const product = catalog.find((p) => p.id === item.id);
    if (!product || product.stock < item.qty) {
      return { ok: false, error: `Not enough stock for ${item.name}` };
    }
  }

  const t = computeTotals(cart);
  const sale: Sale = {
    invoiceNo: nextInvoiceNo(),
    cashier: cashierName,
    customerName: cart.customer?.name ?? null,
    lines: cart.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, emoji: i.emoji })),
    subtotal: t.subtotal,
    discount: t.discount,
    pointsRedeemed: t.redeemPoints,
    tax: t.tax,
    total: t.total,
    payment: cart.payMethod,
    pointsEarned: cart.customer ? t.pointsEarned : 0,
    createdAt: Date.now(),
  };

  useSales.getState().add(sale);
  useProducts.getState().decrement(cart.items.map((i) => ({ id: i.id, qty: i.qty })));
  if (cart.customer) {
    useCustomers.getState().applySale(cart.customer.id, t.pointsEarned, t.redeemPoints, t.total);
  }
  useCart.getState().reset();
  return { ok: true, sale };
}
