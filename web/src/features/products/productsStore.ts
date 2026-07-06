import { create } from 'zustand';
import productsData from '@/data/products.json';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  reorderPoint: number;
  emoji: string; // fallback shown when `image` is empty or fails to load
  image: string; // primary product photo (URL); '' means use the emoji
  category: string;
}

export type StockStatus = 'In stock' | 'Low stock' | 'Out of stock';
export function statusFor(p: Product): StockStatus {
  if (p.stock <= 0) return 'Out of stock';
  if (p.stock <= p.reorderPoint) return 'Low stock';
  return 'In stock';
}

const SEED = productsData as Product[];

export type ProductInput = Omit<Product, 'id'>;

interface ProductsState {
  products: Product[];
  create: (input: ProductInput) => { ok: boolean; error?: string };
  update: (id: string, patch: Partial<ProductInput>) => void;
  remove: (id: string) => void;
  decrement: (lines: { id: string; qty: number }[]) => void;
}

let seq = 100;

// SF-501 / SF-601: product catalog + CRUD.
export const useProducts = create<ProductsState>((set, get) => ({
  products: SEED,
  create: (input) => {
    if (get().products.some((p) => p.sku === input.sku)) return { ok: false, error: 'SKU already exists' };
    set((s) => ({ products: [{ ...input, id: 'p' + ++seq }, ...s.products] }));
    return { ok: true };
  },
  update: (id, patch) => set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  remove: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
  decrement: (lines) =>
    set((s) => ({
      products: s.products.map((p) => {
        const line = lines.find((l) => l.id === p.id);
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      }),
    })),
}));

export const CATEGORIES = ['All', 'Beverages', 'Bakery', 'Dairy', 'Produce', 'Household', 'Pantry'];
