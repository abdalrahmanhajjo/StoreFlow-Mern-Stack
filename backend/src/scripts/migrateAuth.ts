/**
 * Migration script: backfills existing users and stores into the new
 * StoreMembership and Subscription models.
 *
 * This is a one-time migration for existing production data. Run AFTER
 * seeding plans (seedPlans.ts).
 *
 * Usage: npx ts-node src/scripts/migrateAuth.ts
 */
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Store } from '../models/store.model';
import { Plan } from '../models/plan.model';
import { StoreMembership } from '../models/storeMembership.model';
import { Subscription } from '../models/subscription.model';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/storeflow';

const ROLE_MAP: Record<string, 'owner' | 'administrator' | 'manager' | 'cashier' | 'employee'> = {
  owner: 'owner',
  manager: 'manager',
  cashier: 'cashier',
  platform_admin: 'administrator',
};

async function migrate(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Find the Free plan to assign as default
  const freePlan = await Plan.findOne({ code: 'free' });
  if (!freePlan) {
    console.warn('Free plan not found. Run seedPlans.ts first. Defaulting to no plan.');
  } else {
    console.log(`Found plan: ${freePlan.code} (${freePlan.publicId})`);
  }

  // 2. Backfill StoreMembership for every user that has a storeId
  const users = await User.find({ storeId: { $ne: null } }).lean();
  console.log(`Found ${users.length} users with store assignments`);

  let membershipCount = 0;
  for (const user of users) {
    const storeRole = ROLE_MAP[user.role] || 'employee';
    const existing = await StoreMembership.findOne({ store: user.storeId, user: user._id }).lean();
    if (!existing) {
      await StoreMembership.create({
        publicId: new mongoose.Types.ObjectId().toString(),
        store: user.storeId!,
        user: user._id,
        role: storeRole,
        status: 'active',
      });
      membershipCount++;
    }
  }
  console.log(`Created ${membershipCount} StoreMembership records`);

  // 3. Assign planId on stores that don't have one
  if (freePlan) {
    const storesWithoutPlan = await Store.find({ planId: null }).lean();
    console.log(`Found ${storesWithoutPlan.length} stores without a plan`);

    for (const store of storesWithoutPlan) {
      await Store.updateOne({ _id: store._id }, { $set: { planId: freePlan._id } });
    }
    console.log(`Assigned Free plan to ${storesWithoutPlan.length} stores`);
  }

  // 4. Create Subscription records for stores that have an owner
  // Note: old stores use `ownerId`, new stores use `owner`
  const storesAll = await Store.find().lean();
  const storesWithOwner = storesAll.filter((s: any) => s.owner || s.ownerId);

  console.log(`Found ${storesWithOwner.length} stores with owners`);

  let subCount = 0;
  for (const store of storesWithOwner) {
    const ownerId = (store as any).owner || (store as any).ownerId;
    if (!ownerId) continue;

    const planId = store.planId || freePlan?._id;
    if (!planId) continue;

    const existingSub = await Subscription.findOne({ user: ownerId, plan: planId }).lean();
    if (!existingSub) {
      const plan = planId === freePlan?._id ? freePlan : await Plan.findById(planId).lean();
      await Subscription.create({
        publicId: new mongoose.Types.ObjectId().toString(),
        user: ownerId,
        plan: planId,
        planVersion: plan?.version ?? 1,
        status: 'active',
        billingInterval: 'monthly',
        currency: 'USD',
        amountMinor: plan?.billing?.monthlyPriceMinor ?? 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        provider: 'none',
      });
      subCount++;
    }

    // Also ensure StoreMembership exists for the owner (the old `owner` field may be `ownerId`)
    const membershipExists = await StoreMembership.findOne({ store: store._id, user: ownerId }).lean();
    if (!membershipExists) {
      await StoreMembership.create({
        publicId: new mongoose.Types.ObjectId().toString(),
        store: store._id,
        user: ownerId,
        role: 'owner',
        status: 'active',
      });
    }
  }
  console.log(`Created ${subCount} Subscription records`);
  console.log('Ensured owner StoreMembership records exist');

  // 5. Update store slugs, publicIds, and migrate old field names
  const storesAll2 = await Store.find().lean();
  for (const store of storesAll2) {
    const update: Record<string, unknown> = {};
    const storeAny = store as any;

    // Migrate storeName -> name
    if (storeAny.storeName && (!store.name || store.name === '')) {
      update.name = storeAny.storeName;
    }
    // Use name as fallback
    const storeName = store.name || storeAny.storeName || 'Store';

    // Slug
    if (!store.slug || store.slug === '') {
      update.slug = storeName.toLowerCase().replace(/\s+/g, '-') + '-' + store._id.toString().slice(-6);
    }

    // publicId
    if (!store.publicId) {
      update.publicId = new mongoose.Types.ObjectId().toString();
    }

    // Migrate ownerId -> owner
    if (storeAny.ownerId && !store.owner) {
      update.owner = storeAny.ownerId;
    }

    if (Object.keys(update).length > 0) {
      await Store.updateOne({ _id: store._id }, { $set: update });
    }
  }
  console.log(`Updated ${storesAll2.length} stores with migrated fields`);

  console.log('Migration complete');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
