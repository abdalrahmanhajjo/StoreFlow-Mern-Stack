import { create } from 'zustand';
import categoriesData from '@/data/categories.json';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const SEED = categoriesData as Category[];

let seq = 100;

export type CategoryInput = Pick<Category, 'name' | 'emoji' | 'description'>;

interface CategoriesState {
  categories: Category[];
  create: (name: string, emoji: string, description: string) => { ok: boolean; error?: string };
  update: (id: string, input: Partial<CategoryInput>) => { ok: boolean; error?: string };
  remove: (id: string) => void;
}

// SF-602: category management.
export const useCategories = create<CategoriesState>((set, get) => ({
  categories: SEED,
  create: (name, emoji, description) => {
    if (get().categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
      return { ok: false, error: 'Category already exists' };
    }
    set((s) => ({ categories: [...s.categories, { id: 'cat' + ++seq, name: name.trim(), emoji: emoji || '📦', description }] }));
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
    return { ok: true };
  },
  remove: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
}));
