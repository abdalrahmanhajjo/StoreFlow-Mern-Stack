import { create } from 'zustand';
import tenantsData from '@/data/tenants.json';
import applicationsData from '@/data/applications.json';
import platformUsersData from '@/data/platformUsers.json';

export type Plan = 'Free' | 'Pro' | 'Enterprise';

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

const TENANTS = tenantsData as Tenant[];

interface TenantsState {
  tenants: Tenant[];
  toggleSuspend: (id: string) => void;
  remove: (id: string) => void;
  setPlan: (id: string, plan: Plan) => void;
}
export const useTenants = create<TenantsState>((set) => ({
  tenants: TENANTS,
  toggleSuspend: (id) => set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t)) })),
  remove: (id) => set((s) => ({ tenants: s.tenants.filter((t) => t.id !== id) })),
  setPlan: (id, plan) => set((s) => ({ tenants: s.tenants.map((t) => (t.id === id ? { ...t, plan } : t)) })),
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
const APPS = applicationsData as Application[];
interface ApprovalsState {
  applications: Application[];
  approve: (id: string) => void;
  reject: (id: string) => void;
}
export const useApprovals = create<ApprovalsState>((set) => ({
  applications: APPS,
  approve: (id) => set((s) => ({ applications: s.applications.filter((a) => a.id !== id) })),
  reject: (id) => set((s) => ({ applications: s.applications.filter((a) => a.id !== id) })),
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
const USERS = platformUsersData as PlatformUser[];
interface UsersState {
  users: PlatformUser[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
}
export const usePlatformUsers = create<UsersState>((set) => ({
  users: USERS,
  toggle: (id) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, status: u.status === 'active' ? 'disabled' : 'active' } : u)) })),
  remove: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
}));
