import { create } from 'zustand';
import employeesData from '@/data/employees.json';

export type StaffRole = 'owner' | 'manager' | 'cashier';
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: 'active' | 'disabled';
}

const SEED = employeesData as Employee[];

let seq = 100;

interface EmployeesState {
  employees: Employee[];
  invite: (name: string, email: string, role: StaffRole) => { ok: boolean; error?: string };
  setRole: (id: string, role: StaffRole) => void;
  toggleStatus: (id: string) => void;
  remove: (id: string) => void;
}

// SF-1101/1102: in-store staff (client-only; role rules enforced in the page + backend later).
export const useEmployees = create<EmployeesState>((set, get) => ({
  employees: SEED,
  invite: (name, email, role) => {
    if (get().employees.some((e) => e.email.toLowerCase() === email.trim().toLowerCase())) {
      return { ok: false, error: 'Email already in use' };
    }
    set((s) => ({ employees: [...s.employees, { id: 'e' + ++seq, name: name.trim(), email: email.trim(), role, status: 'active' }] }));
    return { ok: true };
  },
  setRole: (id, role) => set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, role } : e)) })),
  toggleStatus: (id) => set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, status: e.status === 'active' ? 'disabled' : 'active' } : e)) })),
  remove: (id) => set((s) => ({ employees: s.employees.filter((e) => e.id !== id) })),
}));
