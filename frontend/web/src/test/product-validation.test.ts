import { describe, it, expect } from 'vitest';
import { productSchema } from '@/lib/validation/product';

const base = {
  name: 'Oat Milk',
  sku: 'OM-001',
  category: 'Beverages',
  price: 3.5,
  cost: 2,
  stock: 10,
  reorderPoint: 5,
  emoji: '🥛',
  image: '',
};

describe('productSchema', () => {
  it('accepts a valid product', () => {
    const r = productSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('rejects a short name and negative values', () => {
    const r = productSchema.safeParse({ ...base, name: 'x', price: -1, stock: -3 });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fields = r.error.issues.map((i) => i.path[0]);
      expect(fields).toContain('name');
      expect(fields).toContain('price');
      expect(fields).toContain('stock');
    }
  });

  it('rejects non-integer stock', () => {
    const r = productSchema.safeParse({ ...base, stock: 2.5 });
    expect(r.success).toBe(false);
  });

  it('sanitises a javascript: image URL to empty string', () => {
    const r = productSchema.safeParse({ ...base, image: 'javascript:alert(1)' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.image).toBe('');
  });

  it('keeps a valid https image URL', () => {
    const r = productSchema.safeParse({ ...base, image: 'https://cdn.test/x.png' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.image).toBe('https://cdn.test/x.png');
  });
});
