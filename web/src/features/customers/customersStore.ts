import { create } from 'zustand';
import customersData from '@/data/customers.json';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  spent: number;
}

const SEED = customersData as Customer[];

interface CustomersState {
  customers: Customer[];
  search: (q: string) => Customer[];
  getById: (id: string) => Customer | undefined;
  create: (name: string, phone?: string) => Customer;
  applySale: (id: string, earned: number, used: number, total: number) => void;
}

let seq = 100;

// SF-504 / SF-901: customer directory + loyalty balance updates.
export const useCustomers = create<CustomersState>((set, get) => ({
  customers: SEED,
  search: (q) => {
    const t = q.trim().toLowerCase();
    if (!t) return get().customers;
    return get().customers.filter((c) => c.name.toLowerCase().includes(t) || c.phone.toLowerCase().includes(t));
  },
  getById: (id) => get().customers.find((c) => c.id === id),
  create: (name, phone = '') => {
    const c: Customer = { id: 'c' + ++seq, name: name.trim(), phone: phone.trim(), points: 0, spent: 0 };
    set((s) => ({ customers: [c, ...s.customers] }));
    return c;
  },
  applySale: (id, earned, used, total) =>
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id === id ? { ...c, points: c.points - used + earned, spent: c.spent + total } : c
      ),
    })),
}));
