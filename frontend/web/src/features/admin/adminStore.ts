import { create } from 'zustand';
import tenantsData from '@/data/tenants.json';
import applicationsData from '@/data/applications.json';
import platformUsersData from '@/data/platformUsers.json';
import { toast } from '@/components/ui';
import {
  isConnected,
  apiChangeStoreStatus,
  apiAdminChangeStorePlan,
  apiSetUserActive,
  apiDeletePlatformUser,
} from '@/lib/api/resources';
import { errorMessage } from '@/lib/http/errors';

// Plan names are admin-defined (see /admin/plans), so any string is valid.
export type Plan = string;

export interface Tenant {
  id: string;
  name: string;
  initials: string;
  color: string;
  owner: string;
  type: string;
  plan: Plan;
  users: number;
  salesMtd: number;
  status: 'active' | 'suspended';
}

const TENANTS = isConnected ? [] : (tenantsData as Tenant[]);

interface TenantsState {
  tenants: Tenant[];
  hydrate: (tenants: Tenant[]) => void;
  toggleSuspend: (id: string) => void;
  remove: (id: string) => void;
  /** planCode drives the API; planName is what the card displays. */
  setPlan: (id: string, planCode: string, planName: string) => void;
}
export const useTenants = create<TenantsState>((set, get) => ({
  tenants: TENANTS,
  hydrate: (tenants) => set({ tenants }),
  toggleSuspend: (id) => {
    const current = get().tenants.find((t) => t.id === id);
    set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t)) }));
    if (isConnected && current) {
      apiChangeStoreStatus(id, current.status === 'active' ? 'suspended' : 'active').catch((err) => {
        set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, status: current.status } : t)) }));
        toast.error(err?.message || 'Could not change the store status on the server');
      });
    }
  },
  remove: (id) => {
    if (isConnected) {
      toast.error('Deleting stores is not supported by the API yet — suspend it instead.');
      return;
    }
    set((s) => ({ tenants: s.tenants.filter((t) => t.id !== id) }));
  },
  setPlan: (id, planCode, planName) => {
    const current = get().tenants.find((t) => t.id === id);
    // Optimistic: show the new plan immediately, roll back on failure
    // (e.g. a 409 when the store's usage exceeds the target plan's limits).
    set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, plan: planName } : t)) }));
    if (isConnected && current) {
      apiAdminChangeStorePlan(id, planCode)
        .then(() => toast(`${current.name} moved to ${planName}`))
        .catch((err) => {
          set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, plan: current.plan } : t)) }));
          toast.error(errorMessage(err, 'Could not change the plan on the server'));
        });
    }
  },
}));

export interface Application {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  type: string;
  plan: Plan;
  submitted: string;
  flagged?: boolean;
}
const APPS = isConnected ? [] : (applicationsData as Application[]);
interface ApprovalsState {
  applications: Application[];
  hydrate: (applications: Application[]) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
}
export const useApprovals = create<ApprovalsState>((set) => ({
  applications: APPS,
  hydrate: (applications) => set({ applications }),
  approve: (id) => {
    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) }));
    if (isConnected) {
      apiChangeStoreStatus(id, 'active')
        .then(() => import('@/lib/api/hydrate').then((m) => m.refreshAdminStores()))
        .catch((err) => toast.error(err?.message || 'Could not approve the store on the server'));
    }
  },
  reject: (id) => {
    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) }));
    if (isConnected) {
      apiChangeStoreStatus(id, 'suspended').catch((err) =>
        toast.error(err?.message || 'Could not reject the store on the server')
      );
    }
  },
}));

export type PlatformRole = 'Platform admin' | 'Owner' | 'Manager' | 'Cashier';
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  store: string;
  status: 'active' | 'disabled';
  lastActive: string;
  root?: boolean;
}
const USERS = isConnected ? [] : (platformUsersData as PlatformUser[]);
interface UsersState {
  users: PlatformUser[];
  hydrate: (users: PlatformUser[]) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}
export const usePlatformUsers = create<UsersState>((set, get) => ({
  users: USERS,
  hydrate: (users) => set({ users }),
  toggle: (id) => {
    const current = get().users.find((u) => u.id === id);
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' } : u)) }));
    if (isConnected && current) {
      apiSetUserActive(id, current.status !== 'active').catch((err) => {
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: current.status } : u)) }));
        toast.error(err?.message || 'Could not change the account status on the server');
      });
    }
  },
  remove: (id) => {
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
    if (isConnected) {
      apiDeletePlatformUser(id).catch((err) =>
        toast.error(err?.message || 'Could not delete the account on the server')
      );
    }
  },
}));
