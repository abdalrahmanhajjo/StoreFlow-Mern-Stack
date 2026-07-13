import { api } from '@/lib/axios';

export interface PlanFeatures {
  suppliersAndPurchaseOrders: boolean;
  fullReporting: boolean;
  advancedAnalytics: boolean;
  multiBranch: boolean;
  prioritySupport: boolean;
}

export interface PlanLimits {
  productLimit: number | null;  // null = unlimited
  staffAccounts: number | null; // null = unlimited
}

export interface Plan {
  _id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  description: string;
  isPopular: boolean;
  isActive: boolean;
  limits: PlanLimits;
  features: PlanFeatures;
  displayOrder: number;
  storeCount: number; // computed by the backend, not stored
}

export type PlanInput = Omit<Plan, '_id' | 'storeCount'>;

export const planService = {
  async list(): Promise<Plan[]> {
    const res = await api.get('/plans');
    return res.data.data;
  },
  async create(input: PlanInput): Promise<Plan> {
    const res = await api.post('/plans', input);
    return res.data.data;
  },
  async update(id: string, input: Partial<PlanInput>): Promise<Plan> {
    const res = await api.post(`/plans/${id}`, input);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/plans/${id}`);
  },
  async assignToStore(storeId: string, planId: string): Promise<void> {
    await api.post(`/plans/stores/${storeId}/assign`, { planId });
  },
};

// --- Minimal store list, scoped to the "Assign plan to store" panel only ---
// (adminStore.ts's Tenant type carries fields your Store model doesn't have —
// that's a separate, bigger rewrite. This stays deliberately narrow.)
export interface AssignableStore {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'suspended';
  planId: string | null;
}

export const storeService = {
  async listForPlanAssignment(): Promise<AssignableStore[]> {
    const res = await api.get('/stores');
    return res.data.data.map((s: any) => ({
      id: s._id,
      name: s.storeName,
      status: s.status,
      planId: s.subscription?.planId?._id ?? s.subscription?.planId ?? null,
    }));
  },
};