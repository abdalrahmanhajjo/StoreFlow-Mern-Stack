/**
 * Auth chain integration test.
 * Run against production Mongo: npx ts-node src/scripts/testAuthChain.ts
 */
import mongoose from 'mongoose';
import { Plan } from '../models/plan.model';
import { Subscription } from '../models/subscription.model';
import { StoreMembership } from '../models/storeMembership.model';
import { hasPermission } from '../utils/authorization.utils';
import { checkPlanLimit } from '../services/subscription.service';

const MONGO_URI = process.env.MONGO_URI || '';
let passed = 0;
let failed = 0;

function check(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.log(`  ✗ ${msg}`);
  }
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  // ── Plan Count ──
  console.log('--- Plans ---');
  const plans = await Plan.find().sort({ displayOrder: 1 }).lean();
  check(plans.length === 5, `5 plans exist (found ${plans.length})`);

  const freePlan = plans.find(p => p.code === 'free')!;
  check(freePlan !== undefined, 'Free plan exists');
  if (freePlan) {
    check(freePlan.billing.monthlyPriceMinor === 0, 'Free plan costs $0 (0 cents)');
    check(freePlan.billing.currency === 'USD', 'Free plan currency is USD');
    check(freePlan.features.inventoryManagement === true, 'Free plan has inventory management');
    check(freePlan.features.employeeManagement === false, 'Free plan lacks employee management');
    check(freePlan.features.advancedAnalytics === false, 'Free plan lacks advanced analytics');
    check(freePlan.limits.productsPerStore === 50, 'Free plan: 50 products per store');
    check(freePlan.limits.membersPerStore === 1, 'Free plan: 1 member per store');
    check(freePlan.limits.stores === 1, 'Free plan: 1 store');
  }

  const starterPlan = plans.find(p => p.code === 'starter')!;
  check(starterPlan !== undefined, 'Starter plan exists');
  if (starterPlan) {
    check(starterPlan.billing.monthlyPriceMinor === 1499, 'Starter costs $14.99 (1499 cents)');
    check(starterPlan.features.employeeManagement === true, 'Starter has employee mgmt');
    check(starterPlan.features.discountManagement === true, 'Starter has discount mgmt');
  }

  const proPlan = plans.find(p => p.code === 'professional')!;
  check(proPlan !== undefined, 'Professional plan exists');
  if (proPlan) {
    check(proPlan.billing.monthlyPriceMinor === 4999, 'Pro costs $49.99 (4999 cents)');
    check(proPlan.features.advancedAnalytics === true, 'Pro has advanced analytics');
    check(proPlan.features.apiAccess === true, 'Pro has API access');
    check(proPlan.features.prioritySupport === false, 'Pro lacks priority support');
    check(proPlan.features.auditLogs === true, 'Pro has audit logs');
    check(proPlan.features.multiStore === true, 'Pro supports multi-store');
    check(proPlan.limits.productsPerStore === 5000, 'Pro: 5000 products');
    check(proPlan.limits.membersPerStore === 10, 'Pro: 10 members');
    check(proPlan.limits.stores === 2, 'Pro: 2 stores');
  }

  const businessPlan = plans.find(p => p.code === 'business')!;
  check(businessPlan !== undefined, 'Business plan exists');
  if (businessPlan) {
    check(businessPlan.billing.monthlyPriceMinor === 9999, 'Business costs $99.99 (9999 cents)');
    check(businessPlan.features.prioritySupport === true, 'Business has priority support');
    check(businessPlan.limits.stores === 5, 'Business: 5 stores');
  }

  const enterprisePlan = plans.find(p => p.code === 'enterprise')!;
  check(enterprisePlan !== undefined, 'Enterprise plan exists');
  if (enterprisePlan) {
    check(enterprisePlan.limits.stores === 100, 'Enterprise: 100 stores');
    check(enterprisePlan.limits.productsPerStore === 1000000, 'Enterprise: 1M products');
  }

  // ── Plan Limits (runtime) ──
  console.log('\n--- Plan Limit Enforcement ---');
  try {
    checkPlanLimit(freePlan!, 'productsPerStore', 60);
    check(false, 'Should have thrown for limit exceeded');
  } catch (err: any) {
    check(err.message.includes('Plan limit exceeded'), `Throws on limit exceeded: ${err.message}`);
  }

  try {
    checkPlanLimit(freePlan!, 'productsPerStore', 30);
    check(true, 'Passes when under limit');
  } catch (err: any) {
    check(false, `Under limit should pass: ${err.message}`);
  }

  // ── Permission Matrix ──
  console.log('\n--- Permission Matrix ---');
  check(hasPermission('owner', 'store.delete'), 'owner: store.delete');
  check(hasPermission('owner', 'billing.manage'), 'owner: billing.manage');
  check(hasPermission('owner', 'membership.delete'), 'owner: membership.delete');

  check(!hasPermission('administrator', 'store.delete'), 'admin: cannot store.delete');
  check(!hasPermission('administrator', 'billing.manage'), 'admin: cannot billing.manage');
  check(hasPermission('administrator', 'store.update'), 'admin: can store.update');

  check(hasPermission('manager', 'product.create'), 'manager: product.create');
  check(!hasPermission('manager', 'product.delete'), 'manager: cannot product.delete');
  check(!hasPermission('manager', 'employee.create'), 'manager: cannot employee.create');

  check(hasPermission('cashier', 'sale.create'), 'cashier: sale.create');
  check(hasPermission('cashier', 'product.read'), 'cashier: product.read');
  check(!hasPermission('cashier', 'product.create'), 'cashier: cannot product.create');
  check(!hasPermission('cashier', 'supplier.read'), 'cashier: cannot supplier.read');

  check(hasPermission('inventory_manager', 'product.create'), 'inv_mgr: product.create');
  check(hasPermission('inventory_manager', 'supplier.create'), 'inv_mgr: supplier.create');
  check(!hasPermission('inventory_manager', 'customer.create'), 'inv_mgr: cannot customer.create');
  check(!hasPermission('inventory_manager', 'employee.read'), 'inv_mgr: cannot employee.read');

  check(hasPermission('employee', 'sale.create'), 'employee: sale.create');
  check(hasPermission('employee', 'product.read'), 'employee: product.read');
  check(!hasPermission('employee', 'supplier.read'), 'employee: cannot supplier.read');

  check(hasPermission('viewer', 'product.read'), 'viewer: product.read');
  check(!hasPermission('viewer', 'product.create'), 'viewer: cannot product.create');
  check(!hasPermission('viewer', 'employee.read'), 'viewer: cannot employee.read');
  check(hasPermission('viewer', 'audit_log.read'), 'viewer: audit_log.read');

  // ── Subscriptions ──
  console.log('\n--- Subscriptions ---');
  const subscriptions = await Subscription.find({ status: 'active' }).lean();
  check(subscriptions.length > 0, `${subscriptions.length} active subscriptions exist`);
  if (subscriptions.length > 0) {
    const sub = subscriptions[0];
    check(sub.currency === 'USD', 'Subscription currency is USD');
    check(sub.amountMinor >= 0, 'Subscription amount is non-negative (cents)');
    check(sub.planVersion >= 1, 'Subscription has planVersion');
  }

  // ── StoreMemberships ──
  console.log('\n--- Store Memberships ---');
  const memberships = await StoreMembership.find({ status: 'active' }).lean();
  check(memberships.length > 0, `${memberships.length} active memberships exist`);

  const ownerMembers = await StoreMembership.find({ role: 'owner', status: 'active' }).lean();
  check(ownerMembers.length > 0, `${ownerMembers.length} owner memberships exist`);

  const uniqueStoreRoles = [...new Set(memberships.map(m => m.role))];
  check(uniqueStoreRoles.length >= 1, `Store roles found: ${uniqueStoreRoles.join(', ')}`);

  // ── Summary ──
  const total = passed + failed;
  console.log('\n' + '='.repeat(50));
  console.log(`  ${passed}/${total} tests passed`);
  if (failed > 0) console.log(`  ${failed} FAILED`);
  console.log('='.repeat(50));

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
