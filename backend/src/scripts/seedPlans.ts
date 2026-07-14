/**
 * Seed script: creates/updates the official StoreFlow pricing plans.
 *
 * These three plans are the single source of truth for billing across the
 * whole product — the marketing site, the pricing page, registration, the
 * billing settings page, AND backend entitlement enforcement all read the
 * same records. Marketing copy and authorization must never disagree, so if
 * you change a limit or feature here, it changes everywhere at once.
 *
 *   Free        $0        1 staff account, 50 products, core POS only
 *   Pro         $49/mo    10 staff, unlimited products, suppliers & POs, reporting
 *   Enterprise  $99/mo    unlimited, advanced analytics, multi-branch, priority support
 *
 * Any previously seeded plan codes not in this list are deactivated (never
 * deleted — existing subscriptions may still reference them).
 *
 * Run via: npx ts-node --transpile-only src/scripts/seedPlans.ts
 */
import mongoose from 'mongoose';
import { Plan } from '../models/plan.model';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '../../.env' });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/storeflow';

const UNLIMITED = -1;

export const PLANS = [
  {
    publicId: 'plan_free',
    code: 'free',
    name: 'Free',
    description: '1 staff, 1 register, up to 50 products. Core POS only.',
    isActive: true,
    isPublic: true,
    isRecommended: false,
    displayOrder: 0,
    supportedIntervals: ['monthly', 'yearly'] as ('monthly' | 'yearly')[],
    billing: { currency: 'USD', monthlyPriceMinor: 0, yearlyPriceMinor: 0 },
    trial: { enabled: false, durationDays: 0, requiresPaymentMethod: false },
    limits: {
      stores: 1,
      membersPerStore: 1,
      productsPerStore: 50,
      customersPerStore: 500,
      ordersPerMonth: UNLIMITED,
      exportsPerMonth: 0,
      inventoryLocations: 1,
      apiRequestsPerMonth: 0,
      storageBytes: 50 * 1024 * 1024,
    },
    features: {
      analytics: false,
      advancedAnalytics: false,
      exportReports: false,
      customBranding: false,
      multiStore: false,
      inventoryManagement: true,
      supplierManagement: false,
      employeeManagement: false,
      discountManagement: false,
      integrations: false,
      apiAccess: false,
      prioritySupport: false,
      auditLogs: false,
    },
  },
  {
    publicId: 'plan_pro',
    code: 'pro',
    name: 'Pro',
    description: 'Up to 10 staff, suppliers, purchase orders, full reporting.',
    isActive: true,
    isPublic: true,
    isRecommended: true,
    displayOrder: 1,
    supportedIntervals: ['monthly', 'yearly'] as ('monthly' | 'yearly')[],
    billing: { currency: 'USD', monthlyPriceMinor: 4900, yearlyPriceMinor: 49000 },
    trial: { enabled: false, durationDays: 0, requiresPaymentMethod: false },
    limits: {
      stores: 1,
      membersPerStore: 10,
      productsPerStore: UNLIMITED,
      customersPerStore: UNLIMITED,
      ordersPerMonth: UNLIMITED,
      exportsPerMonth: 100,
      inventoryLocations: 3,
      apiRequestsPerMonth: 10000,
      storageBytes: 512 * 1024 * 1024,
    },
    features: {
      analytics: true,
      advancedAnalytics: false,
      exportReports: true,
      customBranding: false,
      multiStore: false,
      inventoryManagement: true,
      supplierManagement: true,
      employeeManagement: true,
      discountManagement: true,
      integrations: false,
      apiAccess: false,
      prioritySupport: false,
      auditLogs: true,
    },
  },
  {
    publicId: 'plan_enterprise',
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited staff, advanced analytics, multi-branch, priority support.',
    isActive: true,
    isPublic: true,
    isRecommended: false,
    displayOrder: 2,
    supportedIntervals: ['monthly', 'yearly'] as ('monthly' | 'yearly')[],
    billing: { currency: 'USD', monthlyPriceMinor: 9900, yearlyPriceMinor: 99000 },
    trial: { enabled: false, durationDays: 0, requiresPaymentMethod: false },
    limits: {
      stores: UNLIMITED,
      membersPerStore: UNLIMITED,
      productsPerStore: UNLIMITED,
      customersPerStore: UNLIMITED,
      ordersPerMonth: UNLIMITED,
      exportsPerMonth: UNLIMITED,
      inventoryLocations: UNLIMITED,
      apiRequestsPerMonth: UNLIMITED,
      storageBytes: 5 * 1024 * 1024 * 1024,
    },
    features: {
      analytics: true,
      advancedAnalytics: true,
      exportReports: true,
      customBranding: true,
      multiStore: true,
      inventoryManagement: true,
      supplierManagement: true,
      employeeManagement: true,
      discountManagement: true,
      integrations: true,
      apiAccess: true,
      prioritySupport: true,
      auditLogs: true,
    },
  },
];

export async function seedOfficialPlans(): Promise<void> {
  // Drop the old slug_1 unique index that conflicts with the `code` field.
  try {
    await mongoose.connection.collection('plans').dropIndex('slug_1');
    console.log('Dropped old slug_1 index');
  } catch {
    /* no old index — fine */
  }

  for (const planData of PLANS) {
    const existing = await Plan.findOne({ code: planData.code });
    if (existing) {
      console.log(`Plan "${planData.code}" exists — updating (version ${existing.version} → ${existing.version + 1})`);
      await Plan.updateOne(
        { code: planData.code },
        { $set: { ...planData, version: existing.version + 1 } },
      );
    } else {
      await Plan.create(planData);
      console.log(`Created plan: ${planData.code}`);
    }
  }

  // Retire anything not in the canonical list — kept (not deleted) because
  // existing subscriptions may still reference these plan documents.
  const canonicalCodes = PLANS.map((p) => p.code);
  const retired = await Plan.updateMany(
    { code: { $nin: canonicalCodes }, $or: [{ isActive: true }, { isPublic: true }] },
    { $set: { isActive: false, isPublic: false } },
  );
  if (retired.modifiedCount > 0) {
    console.log(`Retired ${retired.modifiedCount} stale plan(s) (deactivated, not deleted)`);
  }

  console.log('Seeding complete');
}

async function main(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  await seedOfficialPlans();
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
