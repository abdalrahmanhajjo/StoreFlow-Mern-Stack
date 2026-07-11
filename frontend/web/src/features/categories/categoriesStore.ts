import { create } from 'zustand';
import categoriesData from '@/data/categories.json';
import { toast } from '@/components/ui';
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
  description: string;
}

const SEED = isConnected ? [] : (categoriesData as Category[]);

let seq = 100;

export type CategoryInput = Pick<Category, 'name' | 'emoji' | 'description'>;

interface CategoriesState {
  categories: Category[];
  hydrate: (categories: Category[]) => void;
  create: (name: string, emoji: string, description: string) => { ok: boolean; error?: string };
  update: (id: string, input: Partial<CategoryInput>) => { ok: boolean; error?: string };
  remove: (id: string) => void;
}

// SF-602: category management. Local-first; connected mode mirrors to the API
// and swaps optimistic rows for the server copies (real ids).
export const useCategories = create<CategoriesState>((set, get) => ({
  categories: SEED,
  hydrate: (categories) => set({ categories }),
  create: (name, emoji, description) => {
    if (get().categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
      return { ok: false, error: 'Category already exists' };
    }
    const localId = 'cat' + ++seq;
    set((s) => ({ categories: [...s.categories, { id: localId, name: name.trim(), emoji: emoji || '📦', description }] }));
    if (isConnected) {
      apiCreateCategory(name.trim(), description)
        .then((server) =>
          set((s) => ({
            categories: s.categories.map((c) => (c.id === localId ? { ...server, emoji: emoji || server.emoji } : c)),
          }))
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
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, name, emoji: input.emoji ?? c.emoji, description: input.description ?? c.description } : c)) }));
    if (isConnected) {
      apiUpdateCategory(id, { name: input.name?.trim(), description: input.description }).catch((err) =>
        toast.error(err?.message || 'Could not save category changes to the server')
      );
    }
    return { ok: true };
  },
  remove: (id) => {
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    if (isConnected) {
      apiDeleteCategory(id).catch((err) =>
        toast.error(err?.message || 'Could not delete the category on the server')
      );
    }
  },
}));
