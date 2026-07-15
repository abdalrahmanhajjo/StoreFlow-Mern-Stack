/**
 * One-shot migration: upgrades admin-created legacy plan docs (slug/priceMonthly/
 * productLimit shape) to the canonical billing Plan shape, and re-points every
 * subscription that references a deleted plan doc onto the matching new plan.
 *
 * Faithful to the admin's configuration:
 *   Free       $0    — 50 products, 1 staff
 *   Pro        $30   — unlimited products, 10 staff, suppliers + reporting
 *   Enterprise $200  — unlimited everything, every feature
 *
 * Run: npx ts-node --transpile-only src/scripts/migratePlansToCanonical.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const UNLIMITED = -1;

/** Legacy limit (null = unlimited) → canonical (-1 = unlimited). */
const lim = (v: number | null | undefined, fallback: number): number =>
  v === null ? UNLIMITED : (v ?? fallback);

async function main() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const db = mongoose.connection.db!;
  const plansCol = db.collection('plans');
  const subsCol = db.collection('subscriptions');

  const legacy = await plansCol.find({ code: { $exists: false } }).toArray();
  console.log(`Found ${legacy.length} legacy plan docs to upgrade`);

  const byCode: Record<string, mongoose.Types.ObjectId> = {};

  for (const p of legacy) {
    const code = String(p.name).toLowerCase(); // Free → free, Pro → pro, …
    const monthlyMinor = Math.round((p.priceMonthly ?? 0) * 100);
    // Yearly = 12 months with the same 20% discount the pricing UI advertises.
    const yearlyMinor = Math.round(monthlyMinor * 12 * 0.8);
    const f = p.features ?? {};
    const l = p.limits ?? {};
    const isFree = monthlyMinor === 0;
    const staff = lim(l.staffAccounts, 1);

    const canonical = {
      publicId: p.publicId ?? `plan_${code}`,
      code,
      name: p.name,
      description: p.description || (
        isFree ? 'Get started with the essentials — free forever.'
        : code === 'pro' ? 'Everything a growing store needs.'
        : 'Unlimited scale with priority support.'
      ),
      isActive: true,
      isPublic: true,
      isRecommended: code === 'pro' || Boolean(p.isPopular),
      displayOrder: isFree ? 0 : code === 'pro' ? 1 : 2,
      supportedIntervals: ['monthly', 'yearly'],
      billing: { currency: 'USD', monthlyPriceMinor: monthlyMinor, yearlyPriceMinor: yearlyMinor },
      providerPriceIds: {},
      trial: { enabled: false, durationDays: 0, requiresPaymentMethod: false },
      limits: {
        stores: f.multiBranch ? UNLIMITED : 1,
        membersPerStore: staff,
        productsPerStore: lim(l.productLimit, 50),
        customersPerStore: isFree ? 500 : UNLIMITED,
        ordersPerMonth: UNLIMITED,
        exportsPerMonth: f.fullReporting ? (f.prioritySupport ? UNLIMITED : 100) : 0,
        inventoryLocations: f.multiBranch ? UNLIMITED : isFree ? 1 : 3,
        apiRequestsPerMonth: f.prioritySupport ? UNLIMITED : isFree ? 0 : 10000,
        storageBytes: isFree ? 50 * 1024 * 1024 : f.prioritySupport ? 5 * 1024 * 1024 * 1024 : 512 * 1024 * 1024,
      },
      features: {
        analytics: Boolean(f.fullReporting),
        advancedAnalytics: Boolean(f.advancedAnalytics),
        exportReports: Boolean(f.fullReporting),
        customBranding: Boolean(f.prioritySupport),
        multiStore: Boolean(f.multiBranch),
        inventoryManagement: true,
        supplierManagement: Boolean(f.suppliersAndPurchaseOrders),
        employeeManagement: staff === UNLIMITED || staff > 1,
        discountManagement: !isFree,
        integrations: Boolean(f.suppliersAndPurchaseOrders),
        apiAccess: Boolean(f.advancedAnalytics),
        prioritySupport: Boolean(f.prioritySupport),
        auditLogs: Boolean(f.fullReporting),
      },
      version: 1,
    };

    await plansCol.updateOne(
      { _id: p._id },
      {
        $set: canonical,
        // Retire the legacy fields so nothing reads them by accident.
        $unset: { slug: '', priceMonthly: '', isPopular: '' },
      },
    );
    byCode[code] = p._id as mongoose.Types.ObjectId;
    console.log(`Upgraded "${p.name}" → code=${code} $${(monthlyMinor / 100).toFixed(2)}/mo`);
  }

  // ---- Re-point subscriptions that reference deleted plan docs ----
  // Old canonical catalog (deleted via the admin UI) — map old codes to the
  // closest of the three current tiers.
  const OLD_CODE_TO_NEW: Record<string, string> = {
    free: 'free',
    starter: 'pro',
    pro: 'pro',
    professional: 'pro',
    business: 'enterprise',
    enterprise: 'enterprise',
  };
  const knownOldIds: Record<string, string> = {
    '6a555086f44edd3965f2df5e': 'free',
    '6a5550a449b86756d779ef80': 'starter',
    '6a5550a549b86756d779ef81': 'professional',
    '6a5550a549b86756d779ef82': 'business',
    '6a5550a649b86756d779ef83': 'enterprise',
    '6a5693404abfcd406bacc5ff': 'pro',
  };

  const existingIds = new Set((await plansCol.find({}).project({ _id: 1 }).toArray()).map((x) => String(x._id)));
  const subs = await subsCol.find({}).toArray();
  let repointed = 0;
  for (const s of subs) {
    if (existingIds.has(String(s.plan))) continue;
    const oldCode = knownOldIds[String(s.plan)];
    // Unknown old plan: infer tier from what the account was paying.
    const newCode = oldCode
      ? OLD_CODE_TO_NEW[oldCode]
      : s.amountMinor === 0 ? 'free' : s.amountMinor >= 9900 ? 'enterprise' : 'pro';
    const newPlanId = byCode[newCode];
    if (!newPlanId) continue;

    const plan = await plansCol.findOne({ _id: newPlanId });
    const set: Record<string, unknown> = { plan: newPlanId, planVersion: 1 };
    // Live subscriptions adopt the new catalog price for their interval.
    if (['active', 'trialing'].includes(s.status)) {
      set.amountMinor = s.billingInterval === 'yearly'
        ? plan!.billing.yearlyPriceMinor
        : plan!.billing.monthlyPriceMinor;
      set.currency = plan!.billing.currency;
    }
    await subsCol.updateOne({ _id: s._id }, { $set: set });
    repointed++;
  }
  console.log(`Re-pointed ${repointed} subscriptions onto the new plans`);

  const check = await plansCol.find({}).project({ code: 1, name: 1, isActive: 1, isPublic: 1, 'billing.monthlyPriceMinor': 1 }).toArray();
  for (const c of check) console.log('now:', c.code, c.name, 'active:', c.isActive, 'public:', c.isPublic, '$' + ((c as any).billing.monthlyPriceMinor / 100));

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
