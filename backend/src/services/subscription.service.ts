import { Types } from 'mongoose';
import { Subscription } from '../models/subscription.model';
import { Plan } from '../models/plan.model';
import { BillingAccount } from '../models/billingAccount.model';
import { AppError } from '../utils/error.utils';

export type SubscriptionContext = {
  subscription: import('../models/subscription.model').ISubscription;
  plan: import('../models/plan.model').IPlan;
};

/**
 * Resolves the active (or trialing) subscription for a user.
 * First looks up the user's BillingAccount, then finds the subscription.
 * Returns both the subscription and its plan document.
 * Throws AppError if no active subscription is found.
 */
export async function resolveActiveSubscription(userId: Types.ObjectId): Promise<SubscriptionContext> {
  const account = await BillingAccount.findOne({ owner: userId }).lean();
  if (!account) {
    throw new AppError('No billing account found. Please subscribe to a plan.', 402);
  }

  const subscription = await Subscription.findOne({
    account: account._id,
    status: { $in: ['active', 'trialing'] },
  }).sort({ currentPeriodStart: -1 });

  if (!subscription) {
    throw new AppError('No active subscription found. Please subscribe to a plan.', 402);
  }

  const plan = await Plan.findById(subscription.plan);
  if (!plan) {
    throw new AppError('Subscription plan not found. Contact support.', 500);
  }

  return { subscription, plan };
}

/**
 * Resolves the subscription context for a billing account regardless of
 * lifecycle state. Prefers an active/trialing subscription; falls back to the
 * most recent subscription in any state so grace-period and read-only
 * accounts still resolve their last-known plan for entitlement checks.
 * Throws AppError 402 when the account has never subscribed.
 */
export async function resolveSubscriptionContext(accountId: Types.ObjectId): Promise<SubscriptionContext> {
  let subscription = await Subscription.findOne({
    account: accountId,
    status: { $in: ['active', 'trialing'] },
  }).sort({ currentPeriodStart: -1 });

  if (!subscription) {
    subscription = await Subscription.findOne({ account: accountId })
      .sort({ currentPeriodStart: -1 });
  }

  if (!subscription) {
    throw new AppError('No active subscription found. Please subscribe to a plan.', 402);
  }

  const plan = await Plan.findById(subscription.plan);
  if (!plan) {
    throw new AppError('Subscription plan not found. Contact support.', 500);
  }

  return { subscription, plan };
}

export function isFeatureEnabled(plan: import('../models/plan.model').IPlan, feature: keyof typeof plan.features): boolean {
  return plan.features[feature] === true;
}

export function checkPlanLimit<T extends keyof import('../models/plan.model').IPlan['limits']>(
  plan: import('../models/plan.model').IPlan,
  limit: T,
  currentCount: number,
): void {
  const max = plan.limits[limit];
  if (max !== null && max !== undefined && max >= 0 && currentCount >= max) {
    throw new AppError(
      `Plan limit exceeded: ${limit} (${currentCount}/${max}). Upgrade your plan to increase this limit.`,
      403,
    );
  }
}
