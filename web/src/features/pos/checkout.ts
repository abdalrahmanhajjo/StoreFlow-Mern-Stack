import { useCart, computeTotals, TAX_RATE } from './cartStore';
import { useProducts } from '@/features/products/productsStore';
import { useCustomers } from '@/features/customers/customersStore';
import { useSales, nextInvoiceNo, type Sale } from '@/features/sales/salesStore';
import { isConnected, apiCreateSale } from '@/lib/api/resources';
import { refreshProducts, refreshCustomers } from '@/lib/api/hydrate';

export type CheckoutResult =
  | { ok: true; sale: Sale }
  | { ok: false; error: string };

// SF-503: validate stock, then atomically create invoice + decrement stock +
// award/redeem points. Connected mode posts the sale and lets the server do
// the math (invoice number, stock decrement, loyalty award), then reconciles
// products and customers from the server's answer.
export async function completeSale(cashierName: string): Promise<CheckoutResult> {
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

  if (isConnected) {
    try {
      const sale = await apiCreateSale({
        items: cart.items.map((i) => ({ productId: i.id, quantity: i.qty })),
        // The API has no loyalty redemption yet — folding the redeemed value
        // into the discount keeps the charged total identical.
        discount: t.discount + t.redeem,
        taxRate: TAX_RATE * 100,
        paymentMethod: cart.payMethod === 'Card' ? 'card' : 'cash',
        customerId: cart.customer?.id,
        cashierName,
      });
      useSales.getState().add(sale);
      // Server truth for stock levels and loyalty balances.
      void refreshProducts();
      void refreshCustomers();
      useCart.getState().reset();
      return { ok: true, sale };
    } catch (err) {
      return { ok: false, error: (err as Error)?.message || 'Checkout failed — please try again' };
    }
  }

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
