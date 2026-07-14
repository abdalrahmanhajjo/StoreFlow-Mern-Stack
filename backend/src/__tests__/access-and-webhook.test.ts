import { describe, it, expect, beforeEach } from 'vitest';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import Stripe from 'stripe';
import { Plan } from '../models/plan.model';
import { Subscription } from '../models/subscription.model';
import { BillingAccount } from '../models/billingAccount.model';
import { User } from '../models/user.model';
import { requireActiveSubscription } from '../middleware/authorization.middleware';
import { StripeProvider } from '../services/billing/stripeProvider';

function pubId(prefix = 't'): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

const TEST_PWH = bcrypt.hashSync('Password123!', 10);

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

async function makeAccountWithSubscription(subOverrides: Record<string, any>) {
  const user = await User.create({
    name: 'Access Test User',
    email: `access-${pubId()}@example.com`,
    passwordHash: TEST_PWH,
    role: 'owner',
  });
  const account = await BillingAccount.create({
    publicId: pubId('acct'), owner: user._id, name: user.name, email: user.email,
  });
  const plan = await Plan.create({
    publicId: pubId('plan'), code: pubId('code'), name: 'Access Plan',
    ...PLAN_DEFAULTS,
  });
  const subscription = await Subscription.create({
    publicId: pubId('sub'),
    account: account._id,
    user: user._id,
    plan: plan._id,
    planVersion: 1,
    billingInterval: 'monthly',
    currency: 'USD',
    amountMinor: 0,
    provider: 'none',
    currentPeriodStart: new Date(Date.now() - 86400000),
    currentPeriodEnd: new Date(Date.now() + 86400000 * 29),
    ...subOverrides,
  });
  return { user, account, plan, subscription };
}

/** Runs the middleware against a minimal req and resolves with the next() error (if any). */
function runAccessCheck(userId: string, method: string): Promise<{ err?: any; req: any }> {
  const req: any = { user: { sub: userId }, method };
  return new Promise((resolve) => {
    requireActiveSubscription(req, {} as any, (err?: any) => resolve({ err, req }));
  });
}

describe('requireActiveSubscription access modes', () => {
  beforeEach(async () => {
    await Plan.deleteMany({}); await User.deleteMany({});
    await BillingAccount.deleteMany({}); await Subscription.deleteMany({});
  });

  it('active subscription: writes allowed, full access', async () => {
    const { user, subscription } = await makeAccountWithSubscription({ status: 'active' });
    const { err, req } = await runAccessCheck(user._id.toString(), 'POST');
    expect(err).toBeUndefined();
    expect(req.accessMode).toBe('full');
    expect(req.subscription.subscription.publicId).toBe(subscription.publicId);
  });

  it('past_due within grace window: writes still allowed, grace mode', async () => {
    const { user } = await makeAccountWithSubscription({
      status: 'past_due',
      pastDueSince: new Date(Date.now() - 86400000),
      gracePeriodEndsAt: new Date(Date.now() + 86400000 * 3),
    });
    const { err, req } = await runAccessCheck(user._id.toString(), 'POST');
    expect(err).toBeUndefined();
    expect(req.accessMode).toBe('grace');
  });

  it('past_due after grace window: writes rejected with 402, reads allowed', async () => {
    const { user } = await makeAccountWithSubscription({
      status: 'past_due',
      pastDueSince: new Date(Date.now() - 86400000 * 10),
      gracePeriodEndsAt: new Date(Date.now() - 86400000 * 3),
    });

    const write = await runAccessCheck(user._id.toString(), 'POST');
    expect(write.err).toBeDefined();
    expect(write.err.statusCode).toBe(402);

    const read = await runAccessCheck(user._id.toString(), 'GET');
    expect(read.err).toBeUndefined();
    expect(read.req.accessMode).toBe('read_only');
    // Last-known plan context still resolves so read routes can render
    expect(read.req.subscription.plan.name).toBe('Access Plan');
  });

  it('expired subscription: writes rejected, reads allowed (data retention)', async () => {
    const { user } = await makeAccountWithSubscription({
      status: 'expired',
      expiredAt: new Date(Date.now() - 86400000),
      currentPeriodEnd: new Date(Date.now() - 86400000),
    });

    const write = await runAccessCheck(user._id.toString(), 'DELETE');
    expect(write.err).toBeDefined();
    expect(write.err.statusCode).toBe(402);

    const read = await runAccessCheck(user._id.toString(), 'GET');
    expect(read.err).toBeUndefined();
    expect(read.req.accessMode).toBe('read_only');
  });

  it('account with no subscription at all: rejected with 402 on reads and writes', async () => {
    const user = await User.create({
      name: 'No Sub', email: `nosub-${pubId()}@example.com`,
      passwordHash: TEST_PWH, role: 'owner',
    });
    await BillingAccount.create({
      publicId: pubId('acct'), owner: user._id, name: user.name, email: user.email,
    });

    const write = await runAccessCheck(user._id.toString(), 'POST');
    expect(write.err?.statusCode).toBe(402);

    const read = await runAccessCheck(user._id.toString(), 'GET');
    expect(read.err?.statusCode).toBe(402);
  });

  it('user with no billing account: rejected with 402', async () => {
    const user = await User.create({
      name: 'No Account', email: `noacct-${pubId()}@example.com`,
      passwordHash: TEST_PWH, role: 'owner',
    });
    const { err } = await runAccessCheck(user._id.toString(), 'GET');
    expect(err?.statusCode).toBe(402);
  });
});

describe('Stripe webhook signature verification', () => {
  const secret = 'whsec_test_secret_for_unit_tests';
  let provider: StripeProvider;
  const payload = JSON.stringify({
    id: 'evt_test_1',
    object: 'event',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'cs_test_1' } },
  });

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    provider = new StripeProvider();
  });

  function signedHeader(body: string): string {
    return Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  }

  it('verifies a raw Buffer body (what express.raw delivers)', () => {
    const event = provider.verifyWebhook(Buffer.from(payload), signedHeader(payload));
    expect(event.id).toBe('evt_test_1');
    expect(event.type).toBe('checkout.session.completed');
  });

  it('verifies a raw string body', () => {
    const event = provider.verifyWebhook(payload, signedHeader(payload));
    expect(event.id).toBe('evt_test_1');
  });

  it('rejects a re-serialized Buffer body (the pre-fix failure mode)', () => {
    // JSON.stringify(Buffer) produces {"type":"Buffer","data":[...]} — bytes
    // no longer match the signed payload, so verification must fail.
    const mangled = JSON.stringify(Buffer.from(payload));
    expect(() => provider.verifyWebhook(mangled, signedHeader(payload))).toThrow();
  });

  it('rejects a tampered payload', () => {
    const tampered = payload.replace('checkout.session.completed', 'customer.subscription.deleted');
    expect(() => provider.verifyWebhook(Buffer.from(tampered), signedHeader(payload))).toThrow();
  });

  it('rejects a bad signature header', () => {
    expect(() => provider.verifyWebhook(Buffer.from(payload), 't=123,v1=deadbeef')).toThrow();
  });
});
