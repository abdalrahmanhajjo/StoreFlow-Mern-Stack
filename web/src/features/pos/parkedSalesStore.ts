import { create } from 'zustand';
import type { CartItem, CartCustomer, PayMethod, DiscountMode } from './cartStore';

export interface ParkedSale {
  id: number;
  label: string;
  items: CartItem[];
  customer: CartCustomer | null;
  discountMode: DiscountMode;
  discountRate: number;
  discountFixed: number;
  payMethod: PayMethod;
  cashier: string;
  itemCount: number;
  total: number;
  parkedAt: number;
}

const MAX_PARKED = 10;

interface ParkedState {
  parked: ParkedSale[];
  park: (sale: Omit<ParkedSale, 'id' | 'parkedAt'>) => { ok: true } | { ok: false; error: string };
  resume: (id: number) => ParkedSale | undefined;
  remove: (id: number) => void;
  clear: () => void;
}

let pid = 0;

export const useParkedSales = create<ParkedState>((set, get) => ({
  parked: [],
  park: (sale) => {
    const current = get().parked;
    if (current.length >= MAX_PARKED) return { ok: false, error: `Max ${MAX_PARKED} parked sales reached. Complete or remove one first.` };
    set((s) => ({
      parked: [{ ...sale, id: ++pid, parkedAt: Date.now() }, ...s.parked],
    }));
    return { ok: true };
  },
  resume: (id) => {
    const found = get().parked.find((p) => p.id === id);
    if (found) set((s) => ({ parked: s.parked.filter((p) => p.id !== id) }));
    return found;
  },
  remove: (id) => set((s) => ({ parked: s.parked.filter((p) => p.id !== id) })),
  clear: () => set({ parked: [] }),
}));
