import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { Plan } from '../models/plan.model';
import { Subscription } from '../models/subscription.model';
import { BillingAccount } from '../models/billingAccount.model';
import { User } from '../models/user.model';
import { Store } from '../models/store.model';
import { BillingService } from '../services/billing/billing.service';
import { EntitlementService } from '../services/billing/entitlement.service';

function pubId(prefix = 't'): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

const TEST_PWH = bcrypt.hashSync('Password123!', 10);

function makeUser(overrides: Record<string, any> = {}) {
  return User.create({
    name: 'Test User',
    email: `test-${pubId()}@example.com`,
    passwordHash: TEST_PWH,
    role: 'owner',
    ...overrides,
  });
}

const PLAN_DEFAULTS: Record<string, any> = {
  isActive: true, isPublic: true, isRecommended: false, displayOrder: 0,
  supportedIntervals: ['monthly', 'yearly'],
  billing: { currency: 'USD', monthlyPriceMinor: 0, yearlyPriceMinor: 0 },
  providerPriceIds: {},
  trial: { enabled: false, durationDays: 0, requiresPaymentMethod: true },
  limits: { stores: 1, membersPerStore: 1, productsPerStore: 50, ordersPerMonth: 100, customersPerStore: 100, exportsPerMonth: 10, inventoryLocations: 1, apiRequestsPerMonth: 1000, storageBytes: 52428800 },
  features: { analytics: false, advancedAnalytics: false, exportReports: false, customBranding: false, multiStore: false, inventoryManagement: true, employeeManagement: false, discountManagement: false, integrations: false, apiAccess: false, prioritySupport: false, auditLogs: false },
  version: 1,
};

function makePlan(overrides: Record<string, any> = {}) {
  return Plan.create({
    publicId: pubId('plan'), code: overrides.code ?? pubId('code'), name: overrides.name ?? 'Test Plan',
    ...PLAN_DEFAULTS,
    ...overrides,
  });
}

describe('Plan model', () => {
  it('creates and queries plans', async () => {
    const plan = await makePlan({ code: 'free', name: 'Free', description: 'Free plan' });
    const found = await Plan.findOne({ code: 'free' });
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Free');
    expect(found!.billing.monthlyPriceMinor).toBe(0);
  });

  it('rejects negative price', async () => {
    await expect(Plan.create({
      publicId: pubId('plan'), code: 'test', name: 'Test',
      ...PLAN_DEFAULTS,
      billing: { currency: 'USD', monthlyPriceMinor: -1, yearlyPriceMinor: 0 },
    })).rejects.toThrow();
  });
});

describe('BillingAccount', () => {
  it('creates account for a user', async () => {
    const user = await makeUser();
    const account = await BillingAccount.create({
      publicId: pubId('acct'), owner: user._id, name: user.name, email: user.email,
    });
    expect(account.owner.toString()).toBe(user._id.toString());
  });
});

describe('BillingService', () => {
  let billingService: BillingService;
  let user: any;

  beforeEach(async () => {
    await Plan.deleteMany({}); await User.deleteMany({});
    await BillingAccount.deleteMany({}); await Subscription.deleteMany({}); await Store.deleteMany({});

    user = await makeUser({ email: 'billing-test@example.com' });
    await makePlan({ code: 'free', name: 'Free', billing: { currency: 'USD', monthlyPriceMinor: 0, yearlyPriceMinor: 0 } });

    billingService = new BillingService();
  });

  it('getOrCreateAccount creates account on first call', async () => {
    const account = await billingService.getOrCreateAccount(user._id.toString());
    expect(account.owner.toString()).toBe(user._id.toString());
    expect(account.name).toBe(user.name);
  });

  it('getOrCreateAccount returns existing account on second call', async () => {
    const first = await billingService.getOrCreateAccount(user._id.toString());
    const second = await billingService.getOrCreateAccount(user._id.toString());
    expect(first._id.toString()).toBe(second._id.toString());
  });

  it('rejects getOrCreateAccount for non-existent user', async () => {
    await expect(billingService.getOrCreateAccount(new mongoose.Types.ObjectId().toString()))
      .rejects.toThrow('User not found');
  });
});

describe('Subscription lifecycle', () => {
  let account: any;
  let proPlan: any;

  beforeEach(async () => {
    await Plan.deleteMany({}); await User.deleteMany({});
    await BillingAccount.deleteMany({}); await Subscription.deleteMany({}); await Store.deleteMany({});

    const user = await makeUser({ email: 'sub-lifecycle@example.com' });

    account = await BillingAccount.create({
      publicId: pubId('acct'), owner: user._id, name: user.name, email: user.email,
    });

    proPlan = await makePlan({
      code: 'pro', name: 'Pro',
      limits: { stores: 1, membersPerStore: 10, productsPerStore: 500, ordersPerMonth: 10000, customersPerStore: 1000, exportsPerMonth: 100, inventoryLocations: 3, apiRequestsPerMonth: 50000, storageBytes: 524288000 },
      features: { analytics: true, advancedAnalytics: true, exportReports: true, customBranding: false, multiStore: false, inventoryManagement: true, employeeManagement: true, discountManagement: true, integrations: false, apiAccess: false, prioritySupport: false, auditLogs: true },
      billing: { currency: 'USD', monthlyPriceMinor: 2999, yearlyPriceMinor: 29900 },
    });
  });

  it('free plan activates immediately', async () => {
    const sub = await Subscription.create({
      publicId: pubId('sub'), account: account._id, user: account.owner,
      plan: proPlan._id, planVersion: 1, status: 'active', billingInterval: 'monthly',
      currency: 'USD', amountMinor: 0, provider: 'none',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    });
    expect(sub.status).toBe('active');
    expect(sub.amountMinor).toBe(0);
  });

  it('paid plan starts as pending before checkout', async () => {
    const sub = await Subscription.create({
      publicId: pubId('sub'), account: account._id, user: account.owner,
      plan: proPlan._id, planVersion: 1, status: 'pending', billingInterval: 'monthly',
      currency: 'USD', amountMinor: 2999, provider: 'stripe',
    });
    expect(sub.status).toBe('pending');
    expect(sub.amountMinor).toBe(2999);
  });
});

describe('EntitlementService', () => {
  let entitlementService: EntitlementService;
  let account: any;
  let proPlan: any;

  beforeEach(async () => {
    await Plan.deleteMany({}); await BillingAccount.deleteMany({});
    await Subscription.deleteMany({}); await User.deleteMany({});

    entitlementService = new EntitlementService();

    const user = await makeUser({ email: 'entitle-test@example.com' });

    account = await BillingAccount.create({
      publicId: pubId('acct'), owner: user._id, name: user.name, email: user.email,
    });

    proPlan = await makePlan({
      code: 'pro', name: 'Pro',
      limits: { stores: 1, membersPerStore: 10, productsPerStore: 500, ordersPerMonth: 10000, customersPerStore: 1000, exportsPerMonth: 100, inventoryLocations: 3, apiRequestsPerMonth: 50000, storageBytes: 524288000 },
      features: { analytics: true, advancedAnalytics: true, exportReports: true, customBranding: false, multiStore: false, inventoryManagement: true, employeeManagement: true, discountManagement: true, integrations: false, apiAccess: false, prioritySupport: false, auditLogs: true },
      billing: { currency: 'USD', monthlyPriceMinor: 2999, yearlyPriceMinor: 29900 },
    });
  });

  async function createSub(status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending' | 'suspended' | 'trialing' | 'grace_period' | 'incomplete', overrides: Record<string, any> = {}) {
    return Subscription.create({
      publicId: pubId('sub'), account: account._id, user: account.owner,
      plan: proPlan._id, planVersion: 1, status, billingInterval: 'monthly',
      currency: 'USD', amountMinor: 2999, provider: 'none',
      currentPeriodStart: new Date(Date.now() - 30 * 86400000),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      ...overrides,
    });
  }

  it('returns full access for active', async () => {
    await createSub('active');
    const e = await entitlementService.getEntitlementsForAccount(account._id.toString());
    expect(e.accessMode).toBe('full');
  });

  it('returns grace for past_due within grace period', async () => {
    const gd = parseInt(process.env.BILLING_GRACE_PERIOD_DAYS ?? '7', 10);
    await createSub('past_due', {
      pastDueSince: new Date(Date.now() - 2 * 86400000),
      gracePeriodEndsAt: new Date(Date.now() + (gd - 2) * 86400000),
    });
    const e = await entitlementService.getEntitlementsForAccount(account._id.toString());
    expect(e.accessMode).toBe('grace');
  });

  it('returns full for canceled still in period', async () => {
    await createSub('cancelled');
    const e = await entitlementService.getEntitlementsForAccount(account._id.toString());
    expect(e.accessMode).toBe('full');
  });

  it('returns read_only for expired', async () => {
    await createSub('expired');
    const e = await entitlementService.getEntitlementsForAccount(account._id.toString());
    expect(e.accessMode).toBe('read_only');
  });

  it('returns read_only for pending', async () => {
    await createSub('pending');
    const e = await entitlementService.getEntitlementsForAccount(account._id.toString());
    expect(e.accessMode).toBe('read_only');
  });

  it('enforceFeature succeeds for allowed feature', async () => {
    await createSub('active');
    await expect(
      entitlementService.enforceFeature('employeeManagement', account._id.toString())
    ).resolves.toBeUndefined();
  });

  it('enforceFeature throws for denied feature', async () => {
    await createSub('active');
    await expect(
      entitlementService.enforceFeature('multiStore', account._id.toString())
    ).rejects.toThrow('Upgrade your plan');
  });

  it('enforceLimit allows under-limit usage', async () => {
    await createSub('active');
    await expect(
      entitlementService.enforceLimit('productsPerStore', account._id.toString(), 100)
    ).resolves.toBeUndefined();
  });

  it('enforceLimit blocks over-limit usage', async () => {
    await createSub('active');
    await expect(
      entitlementService.enforceLimit('productsPerStore', account._id.toString(), 1000)
    ).rejects.toThrow('limit');
  });

  it('returns usage percentages', async () => {
    await createSub('active');
    const usage = await entitlementService.getUsagePercentages(account._id.toString());
    expect(typeof usage).toBe('object');
  });
});

describe('Registration with plan selection', () => {
  beforeEach(async () => {
    await Plan.deleteMany({}); await BillingAccount.deleteMany({});
    await Subscription.deleteMany({}); await User.deleteMany({}); await Store.deleteMany({});
  });

  it('free plan: creates account + active subscription + store', async () => {
    const user = await makeUser({ email: 'free-reg-test@example.com' });

    const plan = await makePlan({
      code: 'free-reg', name: 'Free',
      billing: { currency: 'USD', monthlyPriceMinor: 0, yearlyPriceMinor: 0 },
    });

    const svc = new BillingService();
    const account = await svc.getOrCreateAccount(user._id.toString());

    const sub = await Subscription.create({
      publicId: pubId('sub'), account: account._id, user: user._id,
      plan: plan._id, planVersion: 1, status: 'active', billingInterval: 'monthly',
      currency: 'USD', amountMinor: 0, provider: 'none',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    });

    const store = await Store.create({
      publicId: pubId('store'), name: 'Free Reg Store', owner: user._id, slug: `free-${pubId('slug')}`,
      businessType: 'retail', address: '123 Test St',
      status: 'active',
    });

    user.storeId = store._id;
    await user.save();

    expect(sub.status).toBe('active');
    expect(store.status).toBe('active');
  });

  it('paid plan: creates account + pending subscription', async () => {
    const user = await makeUser({ email: 'paid-reg-test@example.com' });

    const plan = await makePlan({
      code: 'pro-reg', name: 'Pro',
      limits: { stores: 1, membersPerStore: 10, productsPerStore: 500, ordersPerMonth: 10000, customersPerStore: 1000, exportsPerMonth: 100, inventoryLocations: 3, apiRequestsPerMonth: 50000, storageBytes: 524288000 },
      features: { analytics: true, advancedAnalytics: true, exportReports: true, customBranding: false, multiStore: false, inventoryManagement: true, employeeManagement: true, discountManagement: true, integrations: false, apiAccess: false, prioritySupport: false, auditLogs: true },
      billing: { currency: 'USD', monthlyPriceMinor: 2999, yearlyPriceMinor: 29900 },
    });

    const svc = new BillingService();
    const account = await svc.getOrCreateAccount(user._id.toString());

    const sub = await Subscription.create({
      publicId: pubId('sub'), account: account._id, user: user._id,
      plan: plan._id, planVersion: 1, status: 'pending', billingInterval: 'monthly',
      currency: 'USD', amountMinor: 2999, provider: 'stripe',
    });

    expect(sub.status).toBe('pending');
    expect(sub.amountMinor).toBe(2999);
  });
});

describe('Downgrade conflicts (usage vs target plan limits)', () => {
  let svc: BillingService;
  let user: any;
  let account: any;
  let store: any;
  let freePlan: any;
  let proPlan: any;

  beforeEach(async () => {
    const { StoreMembership } = await import('../models/storeMembership.model');
    await Plan.deleteMany({}); await User.deleteMany({});
    await BillingAccount.deleteMany({}); await Subscription.deleteMany({});
    await Store.deleteMany({}); await StoreMembership.deleteMany({});

    svc = new BillingService();
    user = await makeUser({ email: 'downgrade-test@example.com' });

    freePlan = await makePlan({
      code: 'free', name: 'Free',
      limits: { stores: 1, membersPerStore: 1, productsPerStore: 50, ordersPerMonth: -1, customersPerStore: 100, exportsPerMonth: 0, inventoryLocations: 1, apiRequestsPerMonth: 0, storageBytes: 52428800 },
    });
    proPlan = await makePlan({
      code: 'pro', name: 'Pro',
      limits: { stores: 1, membersPerStore: 10, productsPerStore: -1, ordersPerMonth: -1, customersPerStore: -1, exportsPerMonth: 100, inventoryLocations: 3, apiRequestsPerMonth: 10000, storageBytes: 524288000 },
      billing: { currency: 'USD', monthlyPriceMinor: 4900, yearlyPriceMinor: 49000 },
    });

    account = await svc.getOrCreateAccount(user._id.toString());
    store = await Store.create({
      publicId: pubId('store'), owner: user._id, name: 'Downgrade Test Store',
      slug: 'downgrade-test-' + Date.now(), businessType: 'grocery',
      address: '1 Test St', currency: 'USD', status: 'active', isVerified: true,
    });
    user.storeId = store._id;
    await user.save();

    await Subscription.create({
      publicId: pubId('sub'), account: account._id, user: user._id,
      plan: proPlan._id, planVersion: 1, status: 'active', billingInterval: 'monthly',
      currency: 'USD', amountMinor: 4900, provider: 'manual',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    });
  });

  async function addStaff(count: number) {
    const { StoreMembership } = await import('../models/storeMembership.model');
    const docs = [];
    for (let i = 0; i < count; i++) {
      docs.push({
        publicId: pubId('mem'), store: store._id,
        user: new mongoose.Types.ObjectId(), role: 'cashier' as const, status: 'active' as const,
      });
    }
    return StoreMembership.insertMany(docs);
  }

  it('reports a staff conflict when active members exceed the target limit', async () => {
    await addStaff(5); // Pro allows 10; Free allows 1
    const conflicts = await svc.getDowngradeConflicts(account._id, freePlan);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ metric: 'membersPerStore', current: 5, allowed: 1 });
  });

  it('blocks changePlan with 409 and structured conflicts while over limit', async () => {
    await addStaff(5);
    try {
      await svc.changePlan(user._id.toString(), 'free', 'monthly');
      expect.unreachable('changePlan should have thrown');
    } catch (err: any) {
      expect(err.statusCode).toBe(409);
      expect(err.details?.conflicts).toHaveLength(1);
      expect(err.details.conflicts[0].metric).toBe('membersPerStore');
      expect(err.message).toContain('Staff members: 5 in use, 1 allowed');
    }
    // The subscription is untouched — still on Pro.
    const sub = await Subscription.findOne({ account: account._id });
    expect(sub!.plan.toString()).toBe(proPlan._id.toString());
  });

  it('allows the downgrade once usage is reduced below the limit', async () => {
    const { StoreMembership } = await import('../models/storeMembership.model');
    const staff = await addStaff(5);
    // Owner removes 4 of the 5 staff (data preserved, memberships deactivated).
    for (const m of staff.slice(0, 4)) {
      await StoreMembership.updateOne({ _id: m._id }, { $set: { status: 'removed' } });
    }
    expect(await svc.getDowngradeConflicts(account._id, freePlan)).toHaveLength(0);

    await svc.changePlan(user._id.toString(), 'free', 'monthly');
    const sub = await Subscription.findOne({ account: account._id });
    expect(sub!.plan.toString()).toBe(freePlan._id.toString());
    expect(sub!.amountMinor).toBe(0);
  });

  it('unlimited (-1) target limits never conflict', async () => {
    await addStaff(5);
    const conflicts = await svc.getDowngradeConflicts(account._id, proPlan);
    expect(conflicts).toHaveLength(0);
  });

  it('upgrades are never blocked by conflicts', async () => {
    await addStaff(5);
    const result = await svc.changePlan(user._id.toString(), 'pro', 'yearly');
    expect(result).toBeTruthy();
  });
});
