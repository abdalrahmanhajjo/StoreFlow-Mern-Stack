import { describe, it, expect, beforeEach } from 'vitest';
import { useProducts, statusFor } from '@/features/products/productsStore';
import { useCategories } from '@/features/categories/categoriesStore';

describe('products store (SF-601)', () => {
  it('derives stock status from reorder point', () => {
    expect(statusFor({ id: 'x', name: '', sku: '', barcode: '', price: 1, cost: 0, stock: 0, reorderPoint: 5, emoji: '', image: '', category: '' })).toBe('Out of stock');
    expect(statusFor({ id: 'x', name: '', sku: '', barcode: '', price: 1, cost: 0, stock: 3, reorderPoint: 5, emoji: '', image: '', category: '' })).toBe('Low stock');
    expect(statusFor({ id: 'x', name: '', sku: '', barcode: '', price: 1, cost: 0, stock: 20, reorderPoint: 5, emoji: '', image: '', category: '' })).toBe('In stock');
  });

  it('rejects duplicate SKU on create', () => {
    const { create } = useProducts.getState();
    const ok = create({ name: 'New', sku: 'ZZZ1', barcode: '', price: 1, cost: 0, stock: 4, reorderPoint: 2, emoji: '🆕', image: '', category: 'Bakery' });
    expect(ok.ok).toBe(true);
    const dup = create({ name: 'Dup', sku: 'ZZZ1', barcode: '', price: 2, cost: 1, stock: 1, reorderPoint: 1, emoji: '🔁', image: '', category: 'Bakery' });
    expect(dup.ok).toBe(false);
    expect(dup.error).toMatch(/sku/i);
  });
});

describe('categories store (SF-602)', () => {
  beforeEach(() => {
    // reset to seed length assumptions not needed; store persists across tests in-module
  });

  it('blocks duplicate category names', () => {
    const { create } = useCategories.getState();
    const dup = create('Bakery', '🍞', '');
    expect(dup.ok).toBe(false);
  });

  it('creates a new unique category', () => {
    const { create, categories } = useCategories.getState();
    const before = categories.length;
    const res = create('Frozen ' + Date.now(), '🧊', 'cold');
    expect(res.ok).toBe(true);
    expect(useCategories.getState().categories.length).toBe(before + 1);
  });
});
