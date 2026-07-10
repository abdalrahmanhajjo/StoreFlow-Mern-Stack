import { create } from 'zustand';
import employeesData from '@/data/employees.json';
import { toast } from '@/components/ui';
import { useSession } from '@/store/session';
import {
  isConnected,
  apiCreateEmployee,
  apiUpdateEmployee,
  apiDeleteEmployee,
} from '@/lib/api/resources';

export type StaffRole = 'owner' | 'manager' | 'cashier';
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: 'active' | 'disabled';
}

const SEED = isConnected ? [] : (employeesData as Employee[]);

let seq = 100;

/** Shareable one-time password for invited staff (they change it later). */
function tempPassword(): string {
  return 'Sf!' + Math.random().toString(36).slice(2, 8) + Math.floor(Math.random() * 90 + 10);
}

interface EmployeesState {
  employees: Employee[];
  hydrate: (employees: Employee[]) => void;
  invite: (name: string, email: string, role: StaffRole) => { ok: boolean; error?: string };
  setRole: (id: string, role: StaffRole) => void;
  toggleStatus: (id: string) => void;
  remove: (id: string) => void;
}

// SF-1101/1102: in-store staff. Connected mode creates real user accounts —
// the generated temporary password is surfaced so the owner can share it.
export const useEmployees = create<EmployeesState>((set, get) => ({
  employees: SEED,
  hydrate: (employees) => set({ employees }),
  invite: (name, email, role) => {
    if (get().employees.some((e) => e.email.toLowerCase() === email.trim().toLowerCase())) {
      return { ok: false, error: 'Email already in use' };
    }
    const localId = 'e' + ++seq;
    set((s) => ({ employees: [...s.employees, { id: localId, name: name.trim(), email: email.trim(), role, status: 'active' }] }));
    if (isConnected) {
      const storeId = useSession.getState().user?.storeId;
      if (!storeId) return { ok: false, error: 'No store on this session' };
      const password = tempPassword();
      apiCreateEmployee({ name: name.trim(), email: email.trim(), role, password, storeId })
        .then((server) => {
          set((s) => ({ employees: s.employees.map((e) => (e.id === localId ? server : e)) }));
          toast.success(`Temporary password: ${password}`, `${name.trim()} can now sign in`);
        })
        .catch((err) => {
          set((s) => ({ employees: s.employees.filter((e) => e.id !== localId) }));
          toast.error(err?.message || 'Could not create the staff account on the server');
        });
    }
    return { ok: true };
  },
  setRole: (id, role) => {
    set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, role } : e)) }));
    if (isConnected) {
      apiUpdateEmployee(id, { role }).catch((err) =>
        toast.error(err?.message || 'Could not change the role on the server')
      );
    }
  },
  toggleStatus: (id) => {
    const current = get().employees.find((e) => e.id === id);
    set((s) => ({ employees: s.employees.map((e) => (e.id === id ? { ...e, status: e.status === 'active' ? 'disabled' : 'active' } : e)) }));
    if (isConnected && current) {
      apiUpdateEmployee(id, { isActive: current.status !== 'active' }).catch((err) =>
        toast.error(err?.message || 'Could not change the status on the server')
      );
    }
  },
  remove: (id) => {
    set((s) => ({ employees: s.employees.filter((e) => e.id !== id) }));
    if (isConnected) {
      apiDeleteEmployee(id).catch((err) =>
        toast.error(err?.message || 'Could not remove the staff account on the server')
      );
    }
  },
}));
