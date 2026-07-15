import { z } from 'zod';

// Canonical plan shape — matches plan.model.ts. -1 means unlimited.
const limitValue = z.number().int().min(-1);

const planLimits = z.object({
  stores: limitValue,
  membersPerStore: limitValue,
  productsPerStore: limitValue,
  customersPerStore: limitValue,
  ordersPerMonth: limitValue,
  exportsPerMonth: limitValue,
  inventoryLocations: limitValue,
  apiRequestsPerMonth: limitValue,
  storageBytes: limitValue,
});

const planFeatures = z.object({
  analytics: z.boolean(),
  advancedAnalytics: z.boolean(),
  exportReports: z.boolean(),
  customBranding: z.boolean(),
  multiStore: z.boolean(),
  inventoryManagement: z.boolean(),
  supplierManagement: z.boolean(),
  employeeManagement: z.boolean(),
  discountManagement: z.boolean(),
  integrations: z.boolean(),
  apiAccess: z.boolean(),
  prioritySupport: z.boolean(),
  auditLogs: z.boolean(),
});

const planBilling = z.object({
  currency: z.string().length(3).default('USD'),
  monthlyPriceMinor: z.number().int().min(0),
  yearlyPriceMinor: z.number().int().min(0),
});

const planBody = z.object({
  name: z.string().min(2).max(60),
  code: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  description: z.string().max(300).optional().default(''),
  billing: planBilling,
  limits: planLimits,
  features: planFeatures,
  isActive: z.boolean().optional().default(true),
  isPublic: z.boolean().optional().default(true),
  isRecommended: z.boolean().optional().default(false),
  displayOrder: z.number().int().optional().default(0),
});

export const createPlanSchema = z.object({
  body: planBody,
});

// code is immutable after creation — it's the identity subscriptions and
// checkout flows key off.
export const updatePlanSchema = z.object({
  params: z.object({ id: z.string() }),
  body: planBody.omit({ code: true }).partial(),
});
