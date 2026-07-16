import { useCart, computeTotals } from './cartStore';
import { useProducts } from '@/features/products/productsStore';
import { useCustomers } from '@/features/customers/customersStore';
import { useSales, nextInvoiceNo, type Sale } from '@/features/sales/salesStore';
import { isConnected, apiCreateSale, apiRedeemPoints, apiAdjustPoints } from '@/lib/api/resources';
import { refreshProducts, refreshCustomers } from '@/lib/api/hydrate';
import { roundMoney } from '@/lib/money';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

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
    // A customer created moments ago may still hold its local placeholder id
    // until the server answers — the API would reject it as an invalid ID.
    if (cart.customer && !OBJECT_ID.test(cart.customer.id)) {
      return {
        ok: false,
        error: 'This customer is still being saved — reselect them from the search and try again',
      };
    }

    // The server requires 2–100 characters when a cashier name is sent at all.
    const trimmedCashier = cashierName.trim().slice(0, 100);

    try {
      // Redeem first: the server checks the real balance, so an insufficient
      // one stops the checkout before any money moves.
      if (cart.customer && t.redeemPoints > 0) {
        await apiRedeemPoints(cart.customer.id, t.redeemPoints, 'POS redemption at checkout');
      }
      let sale: Sale;
      try {
        // NOTE: total, subtotal, discount, and tax are omitted intentionally.
        // The backend is the authoritative calculator for all monetary values.
        // The values sent below are "requested" amounts — the server
        // recalculates, validates, and may reject if they disagree.
        sale = await apiCreateSale({
          items: cart.items.map((i) => ({ productId: i.id, quantity: i.qty })),
          // The redeemed value is charged as discount; the points themselves
          // were deducted by the redemption above. Settled to cents so float
          // noise can't push it past the server's subtotal ceiling.
          discount: roundMoney(t.discount + t.redeem),
          taxRate: cart.taxRate * 100,
          paymentMethod: cart.payMethod === 'Card' ? 'card' : 'cash',
          customerId: cart.customer?.id,
          cashierName: trimmedCashier.length >= 2 ? trimmedCashier : undefined,
        });
      } catch (saleErr) {
        // The sale failed after points were taken — give them back.
        if (cart.customer && t.redeemPoints > 0) {
          void apiAdjustPoints(cart.customer.id, t.redeemPoints, 'POS redemption reversal (sale failed)').catch(() => undefined);
        }
        throw saleErr;
      }
      sale.pointsRedeemed = t.redeemPoints;
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
