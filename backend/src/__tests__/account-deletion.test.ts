import { describe, it, expect, beforeEach } from 'vitest';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Store } from '../models/store.model';
import { Plan } from '../models/plan.model';
import { Subscription } from '../models/subscription.model';
import { BillingAccount } from '../models/billingAccount.model';
import { RefreshToken } from '../models/refresh_token.model';
import Product from '../models/product.model';
import Category from '../models/category.model';
import { deleteAccount } from '../controllers/auth.controller';

function pubId(prefix = 't'): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}

const PASSWORD = 'Password123!';
const PWH = bcrypt.hashSync(PASSWORD, 10);

function mockRes() {
  const res: any = {
    statusCode: 0,
    body: null,
    clearedCookies: [] as string[],
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
    clearCookie(name: string) { this.clearedCookies.push(name); },
  };
  return res;
}

function mockReq(userId: string, body: Record<string, any>) {
  return {
    user: { sub: userId, role: 'owner' },
    body,
    ip: '127.0.0.1',
    secure: false,
  } as any;
}

async function makeOwnerWithStore() {
  const owner = await User.create({
    name: 'Owner', email: `own-${pubId()}@example.com`, passwordHash: PWH, role: 'owner',
  });
  const store = await Store.create({
    publicId: pubId('store'), name: 'Del Store', slug: `del-store-${pubId()}`,
    address: '1 Test Way', businessType: 'retail', currency: 'USD',
    status: 'active', owner: owner._id, isVerified: true,
  });
  owner.storeId = store._id;
  await owner.save();

  const staff = await User.create({
    name: 'Staff', email: `stf-${pubId()}@example.com`, passwordHash: PWH,
    role: 'cashier', storeId: store._id,
  });

  const category = await Category.create({ storeId: store._id, name: 'General' } as any);
  await Product.create({
    storeId: store._id, categoryId: category._id, name: 'Widget', sku: `SKU-${pubId()}`,
    price: 500, cost: 200, quantity: 10, isActive: true,
  } as any);

  await RefreshToken.create([
    { userId: owner._id, tokenHash: pubId('tok'), expiresAt: new Date(Date.now() + 86400000) },
    { userId: staff._id, tokenHash: pubId('tok'), expiresAt: new Date(Date.now() + 86400000) },
  ]);

  const account = await BillingAccount.create({
    publicId: pubId('acct'), owner: owner._id, name: owner.name, email: owner.email,
  });
  const plan = await Plan.create({
    publicId: pubId('plan'), code: pubId('code'), name: 'Del Plan',
    isActive: true, isPublic: true, supportedIntervals: ['monthly'],
    billing: { currency: 'USD', monthlyPriceMinor: 999, yearlyPriceMinor: 9990 },
    trial: { enabled: false, durationDays: 0, requiresPaymentMethod: true },
    limits: { stores: 1, membersPerStore: 5, productsPerStore: 100, ordersPerMonth: 100, customersPerStore: 100, exportsPerMonth: 10, inventoryLocations: 1, apiRequestsPerMonth: 1000, storageBytes: 52428800 },
    features: { analytics: true, advancedAnalytics: false, exportReports: false, customBranding: false, multiStore: false, inventoryManagement: true, employeeManagement: false, discountManagement: false, integrations: false, apiAccess: false, prioritySupport: false, auditLogs: false },
    version: 1,
  });
  const subscription = await Subscription.create({
    publicId: pubId('sub'), account: account._id, user: owner._id, plan: plan._id,
    planVersion: 1, status: 'active', billingInterval: 'monthly', currency: 'USD',
    amountMinor: 999, provider: 'none',
    currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 86400000 * 30),
  });

  return { owner, store, staff, account, subscription };
}

describe('deleteAccount', () => {
  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}), Store.deleteMany({}), Plan.deleteMany({}),
      Subscription.deleteMany({}), BillingAccount.deleteMany({}),
      RefreshToken.deleteMany({}), Product.deleteMany({}), Category.deleteMany({}),
    ]);
  });

  it('rejects a wrong password and deletes nothing', async () => {
    const { owner } = await makeOwnerWithStore();
    const res = mockRes();
    await deleteAccount(mockReq(owner._id.toString(), { password: 'wrong-password', confirmText: 'DELETE' }), res);
    expect(res.statusCode).toBe(401);
    expect(await User.findById(owner._id)).not.toBeNull();
    expect(await Store.countDocuments({})).toBe(1);
  });

  it('rejects an owner who did not type DELETE', async () => {
    const { owner } = await makeOwnerWithStore();
    const res = mockRes();
    await deleteAccount(mockReq(owner._id.toString(), { password: PASSWORD, confirmText: 'nope' }), res);
    expect(res.statusCode).toBe(400);
    expect(await User.findById(owner._id)).not.toBeNull();
  });

  it('refuses platform_admin accounts', async () => {
    const admin = await User.create({
      name: 'Admin', email: `adm-${pubId()}@example.com`, passwordHash: PWH, role: 'platform_admin',
    });
    const res = mockRes();
    await deleteAccount(mockReq(admin._id.toString(), { password: PASSWORD }), res);
    expect(res.statusCode).toBe(403);
    expect(await User.findById(admin._id)).not.toBeNull();
  });

  it('owner deletion removes store, data, staff and sessions; retains billing records', async () => {
    const { owner, store, staff, account, subscription } = await makeOwnerWithStore();
    const res = mockRes();
    await deleteAccount(mockReq(owner._id.toString(), { password: PASSWORD, confirmText: 'DELETE' }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.clearedCookies).toContain('refreshToken');

    expect(await User.findById(owner._id)).toBeNull();
    expect(await User.findById(staff._id)).toBeNull();
    expect(await Store.findById(store._id)).toBeNull();
    expect(await Product.countDocuments({ storeId: store._id })).toBe(0);
    expect(await RefreshToken.countDocuments({})).toBe(0);

    // Billing history retained; subscription cancelled, not deleted.
    expect(await BillingAccount.findById(account._id)).not.toBeNull();
    const sub = await Subscription.findById(subscription._id);
    expect(sub).not.toBeNull();
    expect(sub!.status).toBe('cancelled');
    expect(sub!.cancellationReason).toBe('account_deleted');
  });

  it('is retryable: a second call for a half-gone account still succeeds', async () => {
    const { owner } = await makeOwnerWithStore();
    const res1 = mockRes();
    await deleteAccount(mockReq(owner._id.toString(), { password: PASSWORD, confirmText: 'DELETE' }), res1);
    expect(res1.statusCode).toBe(200);

    const res2 = mockRes();
    await deleteAccount(mockReq(owner._id.toString(), { password: PASSWORD, confirmText: 'DELETE' }), res2);
    expect(res2.statusCode).toBe(404);
  });

  it('staff deletion removes only their own login, not store data', async () => {
    const { store, staff } = await makeOwnerWithStore();
    const res = mockRes();
    await deleteAccount(mockReq(staff._id.toString(), { password: PASSWORD }), res);

    expect(res.statusCode).toBe(200);
    expect(await User.findById(staff._id)).toBeNull();
    expect(await RefreshToken.countDocuments({ userId: staff._id })).toBe(0);

    expect(await Store.findById(store._id)).not.toBeNull();
    expect(await Product.countDocuments({ storeId: store._id })).toBe(1);
  });
});
