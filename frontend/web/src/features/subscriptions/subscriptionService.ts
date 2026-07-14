import { api } from '@/lib/axios';

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

export interface PlanLimits {
  stores: number;
  membersPerStore: number;
  productsPerStore: number;
  ordersPerMonth: number;
  customersPerStore: number;
  inventoryLocations: number;
  apiRequestsPerMonth: number;
  storageBytes: number;
}

export interface CurrentCounts {
  productsPerStore: number;
  membersPerStore: number;
  customersPerStore: number;
  stores: number;
}

export interface SubscriptionPlan {
  publicId: string;
  code: string;
  name: string;
}

export interface PlanLimitsResponse {
  limits: PlanLimits | null;
  features: PlanFeatures | null;
  plan: SubscriptionPlan | null;
  currentCounts: CurrentCounts;
  subscriptionStatus: string | null;
  billingInterval: 'monthly' | 'yearly' | null;
  amountMinor: number | null;
  currency: string;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
}

export interface PlanInfo {
  _id: string;
  publicId: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  isPublic: boolean;
  isPopular?: boolean;
  billing: {
    currency: string;
    monthlyPriceMinor: number;
    yearlyPriceMinor: number;
  };
  limits: PlanLimits;
  features: PlanFeatures;
  displayOrder: number;
  version: number;
}

/** A plan limit the account's live usage exceeds (blocks a downgrade). */
export interface LimitConflict {
  metric: 'stores' | 'membersPerStore' | 'productsPerStore' | 'customersPerStore';
  label: string;
  current: number;
  allowed: number;
}

export interface ChangePreview {
  currentPlan: string;
  currentAmountMinor: number;
  currentInterval: 'monthly' | 'yearly';
  newPlan: string;
  newAmountMinor: number;
  newInterval: 'monthly' | 'yearly';
  isDowngrade: boolean;
  limitConflicts: LimitConflict[];
  featuresAdded: string[];
  featuresRemoved: string[];
}

export const subscriptionService = {
  async getLimits(): Promise<PlanLimitsResponse> {
    const res = await api.get('/v1/billing/limits');
    return res.data.data;
  },
  async changePlan(
    planCode: string,
    billingInterval: 'monthly' | 'yearly',
  ): Promise<{ success?: boolean; message?: string }> {
    const res = await api.post('/v1/billing/change-plan', { planCode, billingInterval });
    return res.data;
  },
  async previewChange(
    planCode: string,
    billingInterval: 'monthly' | 'yearly',
  ): Promise<ChangePreview> {
    const res = await api.post('/v1/billing/change-preview', { planCode, billingInterval });
    return res.data.data;
  },
  async listPlans(): Promise<PlanInfo[]> {
    const res = await api.get('/v1/billing/plans');
    return res.data.data;
  },
};
