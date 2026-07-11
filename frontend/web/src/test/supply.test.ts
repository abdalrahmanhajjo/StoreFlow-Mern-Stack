import { describe, it, expect } from 'vitest';
import { useSupply } from '@/features/suppliers/supplyStore';
import { useProducts } from '@/features/products/productsStore';

describe('purchase orders (SF-802)', () => {
  it('receiving a PO increments product stock and locks it', () => {
    const po = useSupply.getState().purchaseOrders.find((p) => p.status === 'pending')!;
    const line = po.lines[0];
    const before = useProducts.getState().products.find((p) => p.id === line.productId)!.stock;

    const added = useSupply.getState().receivePO(po.id);
    expect(added).toBeGreaterThan(0);

    const after = useProducts.getState().products.find((p) => p.id === line.productId)!.stock;
    expect(after).toBe(before + line.qty);
    expect(useSupply.getState().purchaseOrders.find((p) => p.id === po.id)!.status).toBe('received');

    // receiving again is a no-op
    expect(useSupply.getState().receivePO(po.id)).toBe(0);
  });
});

describe('suppliers (SF-801)', () => {
  it('adds and removes suppliers', () => {
    const before = useSupply.getState().suppliers.length;
    expect(useSupply.getState().addSupplier({ name: 'Acme', phone: '+1', email: 'a@acme.com', address: '' }).ok).toBe(true);
    expect(useSupply.getState().suppliers.length).toBe(before + 1);
    const added = useSupply.getState().suppliers.find((s) => s.name === 'Acme')!;
    useSupply.getState().removeSupplier(added.id);
    expect(useSupply.getState().suppliers.some((s) => s.name === 'Acme')).toBe(false);
  });
});
