import { Types } from 'mongoose';
import { BillingAccount } from '../../models/billingAccount.model';
import { Subscription } from '../../models/subscription.model';
import { Plan } from '../../models/plan.model';
import { UsageCounter } from '../../models/usageCounter.model';
import { AppError } from '../../utils/error.utils';

export type AccessMode = 'full' | 'grace' | 'read_only' | 'blocked';

export interface EntitlementContext {
  accountId: string;
  subscriptionId: string;
  subscriptionStatus: string;
  planCode: string;
  planVersion: number;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  accessMode: AccessMode;
  currentPeriodEnd?: Date;
  trialEnd?: Date;
}

export class EntitlementService {
  async getEntitlementsForAccount(accountId: string | Types.ObjectId): Promise<EntitlementContext> {
    const account = await BillingAccount.findById(accountId);
    if (!account) {
      return this.blockedContext('Account not found');
    }

    // Prefer the live subscription — a newer abandoned checkout (status
    // 'incomplete') must never shadow an active one. Fall back to the most
    // recent non-expired record so grace/read-only states still resolve.
    const subscription = await Subscription.findOne({
      account: accountId,
      status: { $in: ['active', 'trialing'] },
    }).sort({ currentPeriodStart: -1 }).populate('plan').lean()
      ?? await Subscription.findOne({
        account: accountId,
        status: { $nin: ['expired'] },
      }).sort({ currentPeriodStart: -1 }).populate('plan').lean();

    if (!subscription || !subscription.plan) {
      // No subscription record means the account is on the free tier —
      // resolve the free plan's entitlements instead of locking them out.
      return this.freePlanContext(account._id.toString());
    }

    return this.contextFromSubscription(account._id.toString(), subscription, subscription.plan);
  }

  /**
   * Builds the entitlement context from an already-loaded subscription and
   * plan — lets hot endpoints (e.g. GET /billing/limits) avoid re-fetching
   * documents they already hold.
   */
  contextFromSubscription(accountId: string, subscription: any, plan: any): EntitlementContext {
    const accessMode = this.determineAccessMode(subscription.status, subscription, new Date());
    return {
      accountId,
      subscriptionId: subscription._id.toString(),
      subscriptionStatus: subscription.status,
      planCode: plan.code,
      planVersion: subscription.planVersion,
      features: plan.features ?? {},
      limits: this.mapLimits(plan.limits ?? {}),
      accessMode,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
    };
  }

  async getEntitlementsForUser(userId: string | Types.ObjectId): Promise<EntitlementContext> {
    const account = await BillingAccount.findOne({ owner: userId });
    if (!account) {
      return this.blockedContext('No billing account found');
    }
    return this.getEntitlementsForAccount(account._id);
  }

  async enforceFeature(feature: string, accountId: string | Types.ObjectId): Promise<void> {
    const ctx = await this.getEntitlementsForAccount(accountId);
    if (ctx.accessMode === 'blocked') {
      throw new AppError('Account access is blocked. Contact support.', 403);
    }
    if (ctx.features[feature] !== true) {
      throw new AppError(
        `Upgrade your plan to use this feature.`,
        403,
      );
    }
  }

  async enforceLimit(
    metric: string,
    accountId: string | Types.ObjectId,
    currentCount: number,
    increment = 0,
  ): Promise<void> {
    const ctx = await this.getEntitlementsForAccount(accountId);
    const limit = ctx.limits[metric];
    if (limit === null || limit === undefined) return;
    if (currentCount + increment > limit) {
      throw new AppError(
        `You have reached the ${metric.replace(/([A-Z])/g, ' $1').toLowerCase().trim()} limit for your current plan (${currentCount + increment}/${limit}). Upgrade to increase this limit.`,
        403,
      );
    }
  }

  async getUsagePercentages(accountId: string | Types.ObjectId): Promise<Record<string, number>> {
    const ctx = await this.getEntitlementsForAccount(accountId);
    const percentages: Record<string, number> = {};
    for (const [key, limit] of Object.entries(ctx.limits)) {
      if (limit === null || limit <= 0) continue;
      const counter = await UsageCounter.findOne({
        account: accountId,
        metric: key,
      }).sort({ createdAt: -1 });
      const value = counter?.value ?? 0;
      percentages[key] = Math.min(100, Math.round((value / limit) * 100));
    }
    return percentages;
  }

  private determineAccessMode(
    status: string,
    subscription: any,
    now: Date,
  ): AccessMode {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'full';
      case 'past_due': {
        if (subscription.gracePeriodEndsAt && now < subscription.gracePeriodEndsAt) {
          return 'grace';
        }
        return 'read_only';
      }
      case 'grace_period':
        return 'grace';
      case 'suspended':
      case 'cancelled': {
        if (subscription.currentPeriodEnd && now < subscription.currentPeriodEnd) {
          return 'full';
        }
        return 'read_only';
      }
      case 'expired':
        return 'read_only';
      case 'incomplete':
      case 'pending':
        return 'read_only';
      default:
        return 'blocked';
    }
  }

  private mapLimits(limits: Record<string, any>): Record<string, number | null> {
    const mapped: Record<string, number | null> = {};
    for (const [key, value] of Object.entries(limits)) {
      mapped[key] = value === -1 ? null : value;
    }
    return mapped;
  }

  private blockedContext(reason: string): EntitlementContext {
    return {
      accountId: '',
      subscriptionId: '',
      subscriptionStatus: 'none',
      planCode: '',
      planVersion: 0,
      features: {},
      limits: {},
      accessMode: 'blocked',
    };
  }

  /** Context for a free-tier account from an already-loaded free plan doc. */
  contextFromFreePlan(accountId: string, freePlan: any): EntitlementContext {
    return {
      accountId,
      subscriptionId: '',
      subscriptionStatus: 'active',
      planCode: freePlan.code,
      planVersion: freePlan.version ?? 1,
      features: (freePlan.features as any) ?? {},
      limits: this.mapLimits((freePlan.limits as any) ?? {}),
      accessMode: 'full',
    };
  }

  private async freePlanContext(accountId: string): Promise<EntitlementContext> {
    const freePlan = await Plan.findOne({ code: 'free', isActive: true }).lean();
    if (!freePlan) {
      return this.readOnlyContext('No subscription and no free plan configured');
    }
    return this.contextFromFreePlan(accountId, freePlan);
  }

  private readOnlyContext(reason: string): EntitlementContext {
    return {
      accountId: '',
      subscriptionId: '',
      subscriptionStatus: 'none',
      planCode: '',
      planVersion: 0,
      features: {},
      limits: {},
      accessMode: 'read_only',
    };
  }
}

export const entitlementService = new EntitlementService();
