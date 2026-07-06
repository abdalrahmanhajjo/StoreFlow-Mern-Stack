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

interface CategoriesState {
  categories: Category[];
  create: (name: string, emoji: string, description: string) => { ok: boolean; error?: string };
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
  remove: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
}));
