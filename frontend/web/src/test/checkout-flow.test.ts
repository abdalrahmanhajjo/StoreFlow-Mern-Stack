import { describe, it, expect, beforeEach } from 'vitest';
import { useCart } from '@/features/pos/cartStore';
import { useProducts } from '@/features/products/productsStore';
import { useCustomers } from '@/features/customers/customersStore';
import { useSales } from '@/features/sales/salesStore';
import { completeSale } from '@/features/pos/checkout';

// End-to-end of the POS domain: cart -> loyalty -> checkout -> stock + points + invoice.
describe('POS checkout flow (integration)', () => {
  beforeEach(() => useCart.getState().reset());

  it('completes a sale: decrements stock, awards points, records the invoice', async () => {
    const product = useProducts.getState().products.find((p) => p.stock > 5)!;
    const stockBefore = product.stock;
    const customer = useCustomers.getState().customers.find((c) => c.points >= 100)!;
    const pointsBefore = customer.points;
    const invoicesBefore = useSales.getState().sales.length;

    // build the cart
    useCart.getState().add(product);
    useCart.getState().add(product); // qty 2
    useCart.getState().setCustomer({ id: customer.id, name: customer.name, points: customer.points });
    useCart.getState().toggleRedeem();

    const res = await completeSale('Test Cashier');
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    // stock decremented by 2
    expect(useProducts.getState().products.find((p) => p.id === product.id)!.stock).toBe(stockBefore - 2);
    // invoice recorded
    expect(useSales.getState().sales.length).toBe(invoicesBefore + 1);
    expect(useSales.getState().sales[0].invoiceNo).toBe(res.sale.invoiceNo);
    // customer points changed (earned minus redeemed) and never negative
    const after = useCustomers.getState().customers.find((c) => c.id === customer.id)!;
    expect(after.points).toBeGreaterThanOrEqual(0);
    expect(after.points).not.toBe(pointsBefore);
    // cart is reset after checkout
    expect(useCart.getState().items.length).toBe(0);
  });

  it('blocks checkout on an empty cart', async () => {
    const res = await completeSale('Test Cashier');
    expect(res.ok).toBe(false);
  });
});
