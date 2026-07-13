import { create } from 'zustand';
import productsData from '@/data/products.json';
import { toast } from '@/components/ui';
import {
  isConnected,
  apiCreateProduct,
  apiUpdateProduct,
  apiDeleteProduct,
} from '@/lib/api/resources';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  cost: number;
  stock: number;
  reorderPoint: number;
  emoji: string; // fallback shown when `image` is empty or fails to load
  image: string; // primary product photo (URL); '' means use the emoji
  category: string;
  supplierId?: string;
}

export type StockStatus = 'In stock' | 'Low stock' | 'Out of stock';
export function statusFor(p: Product): StockStatus {
  if (p.stock <= 0) return 'Out of stock';
  if (p.stock <= p.reorderPoint) return 'Low stock';
  return 'In stock';
}

// Connected mode starts empty and hydrates from the API — never show demo
// rows as if they were the signed-in store's real catalog.
const SEED = isConnected ? [] : (productsData as Product[]);

export type ProductInput = Omit<Product, 'id'>;

interface ProductsState {
  products: Product[];
  hydrate: (products: Product[]) => void;
  create: (input: ProductInput) => { ok: boolean; error?: string };
  update: (id: string, patch: Partial<ProductInput>) => void;
  remove: (id: string) => void;
  decrement: (lines: { id: string; qty: number }[]) => void;
  /** Local-only stock write — for flows the server already applies itself
   * (sales, stock adjustments, PO receiving), so nothing double-mirrors. */
  setStockLocal: (id: string, stock: number) => void;
}

let seq = 100;

/** Resolves the category name the form uses into the server's category id. */
async function categoryIdFor(name: string): Promise<string | undefined> {
  const { useCategories } = await import('@/features/categories/categoriesStore');
  return useCategories.getState().categories.find((c) => c.name === name)?.id;
}

/** Swap a locally-created row for the server's copy (real ObjectId). */
function replaceLocal(localId: string, serverProduct: Product) {
  useProducts.setState((s) => ({
    products: s.products.map((p) => (p.id === localId ? serverProduct : p)),
  }));
}

/** After a rejected update/delete, pull server truth; if that also fails,
 *  fall back to the snapshot taken before the optimistic change. */
async function reconcileProducts(fallback: Product[]) {
  try {
    const { refreshProducts } = await import('@/lib/api/hydrate');
    await refreshProducts();
  } catch {
    useProducts.setState({ products: fallback });
  }
}

// SF-501 / SF-601: product catalog + CRUD. Local state is the source of truth
// the pages render; in connected mode every mutation is mirrored to the API.
export const useProducts = create<ProductsState>((set, get) => ({
  products: SEED,
  hydrate: (products) => set({ products }),
  create: (input) => {
    if (get().products.some((p) => p.sku === input.sku)) return { ok: false, error: 'SKU already exists' };
    const localId = 'p' + ++seq;
    set((s) => ({ products: [{ ...input, id: localId }, ...s.products] }));
    if (isConnected) {
      void (async () => {
        try {
          const catId = await categoryIdFor(input.category);
          if (!catId) throw new Error(`Unknown category "${input.category}"`);
          replaceLocal(localId, await apiCreateProduct(input, catId));
        } catch (err) {
          set((s) => ({ products: s.products.filter((p) => p.id !== localId) }));
          toast.error((err as Error)?.message || 'Could not save the product to the server');
        }
      })();
    }
    return { ok: true };
  },
  update: (id, patch) => {
    const prev = get().products;
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    if (isConnected) {
      void (async () => {
        try {
          const catId = patch.category ? await categoryIdFor(patch.category) : undefined;
          await apiUpdateProduct(id, patch, catId);
        } catch (err) {
          toast.error((err as Error)?.message || 'Could not save product changes to the server');
          // The server rejected the edit — reconcile so the UI can't keep
          // showing a value the server never accepted.
          reconcileProducts(prev);
        }
      })();
    }
  },
  remove: (id) => {
    const prev = get().products;
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    if (isConnected) {
      apiDeleteProduct(id).catch((err) => {
        toast.error(err?.message || 'Could not delete the product on the server');
        // The delete didn't take server-side — restore the row.
        reconcileProducts(prev);
      });
    }
  },
  decrement: (lines) =>
    set((s) => ({
      products: s.products.map((p) => {
        const line = lines.find((l) => l.id === p.id);
        return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
      }),
    })),
  setStockLocal: (id, stock) =>
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, stock } : p)) })),
}));

export const CATEGORIES = ['All', 'Beverages', 'Bakery', 'Dairy', 'Produce', 'Household', 'Pantry'];
