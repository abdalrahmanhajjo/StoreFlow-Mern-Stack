import { create } from 'zustand';
import customersData from '@/data/customers.json';
import { toast } from '@/components/ui';
import {
  isConnected,
  apiCreateCustomer,
  apiUpdateCustomer,
  apiDeleteCustomer,
} from '@/lib/api/resources';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  points: number;
  spent: number;
}

const SEED = isConnected ? [] : (customersData as Customer[]);

export type CustomerInput = Pick<Customer, 'name' | 'phone'>;

interface CustomersState {
  customers: Customer[];
  hydrate: (customers: Customer[]) => void;
  search: (q: string) => Customer[];
  getById: (id: string) => Customer | undefined;
  create: (name: string, phone?: string) => Customer;
  update: (id: string, input: Partial<CustomerInput>) => void;
  remove: (id: string) => void;
  applySale: (id: string, earned: number, used: number, total: number) => void;
}

let seq = 100;

/** After a rejected update/delete, pull server truth; fall back to the
 *  pre-change snapshot if the refetch also fails. */
async function reconcileCustomers(fallback: Customer[]) {
  try {
    const { refreshCustomers } = await import('@/lib/api/hydrate');
    await refreshCustomers();
  } catch {
    useCustomers.setState({ customers: fallback });
  }
}

// SF-504 / SF-901: customer directory + loyalty balance updates. Local-first;
// connected mode mirrors mutations to the API.
export const useCustomers = create<CustomersState>((set, get) => ({
  customers: SEED,
  hydrate: (customers) => set({ customers }),
  search: (q) => {
    const t = q.trim().toLowerCase();
    if (!t) return get().customers;
    return get().customers.filter((c) => c.name.toLowerCase().includes(t) || c.phone.toLowerCase().includes(t));
  },
  getById: (id) => get().customers.find((c) => c.id === id),
  create: (name, phone = '') => {
    const c: Customer = { id: 'c' + ++seq, name: name.trim(), phone: phone.trim(), points: 0, spent: 0 };
    set((s) => ({ customers: [c, ...s.customers] }));
    if (isConnected) {
      apiCreateCustomer(c.name, c.phone || undefined)
        .then((server) =>
          set((s) => ({ customers: s.customers.map((x) => (x.id === c.id ? server : x)) }))
        )
        .catch((err) => {
          set((s) => ({ customers: s.customers.filter((x) => x.id !== c.id) }));
          toast.error(err?.message || 'Could not save the customer to the server');
        });
    }
    return c;
  },
  update: (id, input) => {
    const prev = get().customers;
    set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...input } : c)) }));
    if (isConnected) {
      apiUpdateCustomer(id, input).catch((err) => {
        toast.error(err?.message || 'Could not save customer changes to the server');
        reconcileCustomers(prev);
      });
    }
  },
  remove: (id) => {
    const prev = get().customers;
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }));
    if (isConnected) {
      apiDeleteCustomer(id).catch((err) => {
        toast.error(err?.message || 'Could not delete the customer on the server');
        reconcileCustomers(prev);
      });
    }
  },
  applySale: (id, earned, used, total) =>
    set((s) => ({
      customers: s.customers.map((c) =>
        c.id === id ? { ...c, points: c.points - used + earned, spent: c.spent + total } : c
      ),
    })),
}));
