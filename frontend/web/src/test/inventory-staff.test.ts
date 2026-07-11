import { describe, it, expect } from 'vitest';
import { useProducts } from '@/features/products/productsStore';
import { useInventory } from '@/features/inventory/inventoryStore';
import { can } from '@/lib/rbac';

describe('inventory adjustments (SF-701)', () => {
  it('applies a delta and records history', () => {
    const p = useProducts.getState().products[0];
    const before = p.stock;
    const res = useInventory.getState().adjust(p.id, 5, 'Restock', 'test', 'Tester');
    expect(res.ok).toBe(true);
    expect(useProducts.getState().products.find((x) => x.id === p.id)!.stock).toBe(before + 5);
    expect(useInventory.getState().adjustments[0].productId).toBe(p.id);
  });

  it('blocks a negative-resulting adjustment', () => {
    const p = useProducts.getState().products.find((x) => x.stock < 100)!;
    const res = useInventory.getState().adjust(p.id, -(p.stock + 10), 'Damage', '', 'Tester');
    expect(res.ok).toBe(false);
  });

  it('rejects zero delta', () => {
    const p = useProducts.getState().products[0];
    expect(useInventory.getState().adjust(p.id, 0, 'Recount', '', 'T').ok).toBe(false);
  });
});

describe('employee rules (SF-1101/1102)', () => {
  it('owner can manage everyone and reset passwords', () => {
    expect(can('owner', 'employee.reset')).toBe(true);
    expect(can('owner', 'employee.delete', 'manager')).toBe(true);
    expect(can('owner', 'employee.editRole', 'cashier')).toBe(true);
  });

  it('manager manages cashiers only, never resets passwords', () => {
    expect(can('manager', 'employee.manage')).toBe(true);
    expect(can('manager', 'employee.reset')).toBe(false);
    expect(can('manager', 'employee.delete', 'cashier')).toBe(true);
    expect(can('manager', 'employee.delete', 'manager')).toBe(false);
    expect(can('manager', 'employee.editRole', 'manager')).toBe(false);
  });
});
