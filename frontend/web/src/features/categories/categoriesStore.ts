import { create } from 'zustand';
import categoriesData from '@/data/categories.json';
import { toast } from '@/components/ui';
import { useProducts } from '@/features/products/productsStore';
import {
  isConnected,
  apiCreateCategory,
  apiUpdateCategory,
  apiDeleteCategory,
} from '@/lib/api/resources';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  image: string; // primary photo (URL or data URL); '' means use the emoji
  description: string;
}

const SEED = isConnected
  ? []
  : (categoriesData as Omit<Category, 'image'>[]).map((c) => ({ ...c, image: '' }));

let seq = 100;

/** After a rejected update/delete, pull server truth; fall back to the
 *  pre-change snapshot if the refetch also fails. */
async function reconcileCategories(fallback: Category[]) {
  try {
    const { refreshCategories } = await import('@/lib/api/hydrate');
    await refreshCategories();
  } catch {
    useCategories.setState({ categories: fallback });
  }
}

export type CategoryInput = Pick<Category, 'name' | 'emoji' | 'image' | 'description'>;

interface CategoriesState {
  categories: Category[];
  hydrate: (categories: Category[]) => void;
  create: (input: CategoryInput) => { ok: boolean; error?: string };
  update: (id: string, input: Partial<CategoryInput>) => { ok: boolean; error?: string };
  remove: (id: string) => void;
}

// SF-602: category management. Local-first; connected mode mirrors emoji, image
// and description to the API and swaps optimistic rows for the server copies.
export const useCategories = create<CategoriesState>((set, get) => ({
  categories: SEED,
  hydrate: (categories) => set({ categories }),
  create: (input) => {
    const name = input.name.trim();
    if (get().categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'Category already exists' };
    }
    const localId = 'cat' + ++seq;
    const row: Category = { id: localId, name, emoji: input.emoji || '📦', image: input.image ?? '', description: input.description ?? '' };
    set((s) => ({ categories: [...s.categories, row] }));
    if (isConnected) {
      apiCreateCategory({ name, description: input.description, emoji: input.emoji, image: input.image })
        .then((server) =>
          set((s) => ({ categories: s.categories.map((c) => (c.id === localId ? server : c)) }))
        )
        .catch((err) => {
          set((s) => ({ categories: s.categories.filter((c) => c.id !== localId) }));
          toast.error(err?.message || 'Could not save the category to the server');
        });
    }
    return { ok: true };
  },
  update: (id, input) => {
    const existing = get().categories.find((c) => c.id === id);
    if (!existing) return { ok: false, error: 'Category not found' };
    const name = input.name?.trim() ?? existing.name;
    if (input.name && get().categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: 'Category already exists' };
    }
    const prev = get().categories;
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, name, emoji: input.emoji ?? c.emoji, image: input.image ?? c.image, description: input.description ?? c.description } : c
      ),
    }));
    // Products reference the category by id on the server, so a rename
    // propagates there automatically. The frontend caches the category *name*
    // on each product for display, so re-point those rows to the new name
    // immediately — otherwise the product list (and per-category counts) would
    // show the old name until the next refetch.
    if (name !== existing.name) {
      useProducts.setState((s) => ({
        products: s.products.map((p) => (p.category === existing.name ? { ...p, category: name } : p)),
      }));
    }
    if (isConnected) {
      apiUpdateCategory(id, { name: input.name?.trim(), description: input.description, emoji: input.emoji, image: input.image }).catch((err) => {
        toast.error(err?.message || 'Could not save category changes to the server');
        reconcileCategories(prev);
      });
    }
    return { ok: true };
  },
  remove: (id) => {
    const prev = get().categories;
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    if (isConnected) {
      apiDeleteCategory(id).catch((err) => {
        toast.error(err?.message || 'Could not delete the category on the server');
        reconcileCategories(prev);
      });
    }
  },
}));
