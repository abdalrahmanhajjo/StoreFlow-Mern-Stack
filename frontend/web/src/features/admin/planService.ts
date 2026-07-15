import { api } from '@/lib/axios';

// Canonical billing plan — the SAME documents the pricing page, registration
// and the subscription engine read. -1 in a limit means unlimited.

export interface PlanLimits {
  stores: number;
  membersPerStore: number;
  productsPerStore: number;
  customersPerStore: number;
  ordersPerMonth: number;
  exportsPerMonth: number;
  inventoryLocations: number;
  apiRequestsPerMonth: number;
  storageBytes: number;
}

export interface PlanFeatures {
  analytics: boolean;
  advancedAnalytics: boolean;
  exportReports: boolean;
  customBranding: boolean;
  multiStore: boolean;
  inventoryManagement: boolean;
  supplierManagement: boolean;
  employeeManagement: boolean;
  discountManagement: boolean;
  integrations: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  auditLogs: boolean;
}

export interface PlanBilling {
  currency: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
}

export interface Plan {
  _id: string;
  publicId: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  isPublic: boolean;
  isRecommended: boolean;
  displayOrder: number;
  billing: PlanBilling;
  limits: PlanLimits;
  features: PlanFeatures;
  /** Live active+trialing subscriptions on this plan (computed). */
  subscriberCount: number;
}

export type PlanInput = Omit<Plan, '_id' | 'publicId' | 'subscriberCount'>;

export const planService = {
  async list(): Promise<Plan[]> {
    const res = await api.get('/plans');
    return res.data.data;
  },
  async create(input: PlanInput): Promise<Plan> {
    const res = await api.post('/plans', input);
    return res.data.data;
  },
  async update(id: string, input: Partial<Omit<PlanInput, 'code'>>): Promise<Plan> {
    const res = await api.post(`/plans/${id}`, input);
    return res.data.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/plans/${id}`);
  },
};
