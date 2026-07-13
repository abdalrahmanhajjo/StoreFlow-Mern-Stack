import { z } from 'zod';

const limitValue = z.number().int().positive().nullable(); // null = unlimited

const planBody = z.object({
  name: z.string().min(2).max(60),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  priceMonthly: z.number().min(0),
  description: z.string().max(300).optional().default(''),
  isPopular: z.boolean().optional().default(false),
  limits: z.object({
    productLimit: limitValue,
    staffAccounts: limitValue,
  }),
  features: z.object({
    suppliersAndPurchaseOrders: z.boolean(),
    fullReporting: z.boolean(),
    advancedAnalytics: z.boolean(),
    multiBranch: z.boolean(),
    prioritySupport: z.boolean(),
  }),
  displayOrder: z.number().int().optional().default(0),
});

export const createPlanSchema = z.object({
  body: planBody,
});

export const updatePlanSchema = z.object({
  params: z.object({ id: z.string() }),
  body: planBody.partial(),
});

export const assignPlanSchema = z.object({
  params: z.object({ storeId: z.string() }),
  body: z.object({ planId: z.string() }),
});