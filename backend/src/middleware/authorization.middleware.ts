import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { StoreMembership } from '../models/storeMembership.model';
import { Store } from '../models/store.model';
import { BillingAccount } from '../models/billingAccount.model';
import { resolveSubscriptionContext, isFeatureEnabled, checkPlanLimit } from '../services/subscription.service';
import { EntitlementService } from '../services/billing/entitlement.service';
import { hasPermission, ResourceAction, PermissionDeniedError, PlanFeatureNotEnabledError, PlanLimitExceededError } from '../utils/authorization.utils';
import { AppError } from '../utils/error.utils';

const entitlementService = new EntitlementService();

declare global {
  namespace Express {
    interface Request {
      membership?: import('../models/storeMembership.model').IStoreMembership;
      resolvedStore?: import('../models/store.model').IStore;
      subscription?: import('../services/subscription.service').SubscriptionContext;
    }
  }
}

/**
 * Loads the store the user belongs to from their JWT claims or membership.
 * Sets req.resolvedStore.
 */
export function loadStore(req: Request, _res: Response, next: NextFunction): void {
  // req.body is undefined on bodyless requests (GET/DELETE) in Express 5.
  const storeId = req.storeId || req.params.storeId || req.body?.storeId;

  if (!storeId) {
    next(new Error('No store context available'));
    return;
  }

  Store.findById(storeId).lean().then((store) => {
    if (!store) {
      next(new Error('Store not found'));
      return;
    }
    req.resolvedStore = store;
    next();
  }).catch(next);
}

/**
 * Verifies the user is an active member of the resolved store.
 * Sets req.membership.
 */
export function requireMembership(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || !req.resolvedStore) {
    next(new Error('Authentication and store context required'));
    return;
  }

  StoreMembership.findOne({
    store: req.resolvedStore._id,
    user: req.user.sub,
    status: 'active',
  }).lean().then(async (membership) => {
    if (!membership) {
      // Self-heal: the store's owner is implicitly a member. Accounts created
      // before owner-membership provisioning existed lack the doc — create it
      // instead of locking the owner out of their own store.
      const store = req.resolvedStore as unknown as { owner?: unknown; ownerId?: unknown };
      const ownerId = String(store.owner ?? store.ownerId ?? '');
      if (ownerId && ownerId === req.user!.sub) {
        const created = await StoreMembership.create({
          publicId: new mongoose.Types.ObjectId().toString(),
          store: req.resolvedStore!._id,
          user: req.user!.sub,
          role: 'owner',
          status: 'active',
        });
        req.membership = created.toObject();
        next();
        return;
      }
      next(new PermissionDeniedError('You are not a member of this store'));
      return;
    }
    req.membership = membership;
    next();
  }).catch(next);
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Verifies the user's subscription grants access to this request and loads
 * plan context (req.subscription) for downstream feature/limit checks.
 *
 * Access modes (computed by EntitlementService — the single source of truth):
 *   full      → proceed
 *   grace     → proceed (past-due within grace window keeps access; UI warns)
 *   read_only → safe reads allowed, writes rejected with 402
 *   blocked   → everything rejected with 403
 */
export function requireActiveSubscription(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Authentication required', 401));
    return;
  }

  (async () => {
    const account = await BillingAccount.findOne({ owner: req.user!.sub }).lean();
    if (!account) {
      throw new AppError('No billing account found. Please subscribe to a plan.', 402);
    }

    const entitlements = await entitlementService.getEntitlementsForAccount(account._id);
    if (entitlements.accessMode === 'blocked') {
      throw new AppError('Your account has been suspended. Contact support.', 403);
    }
    if (entitlements.accessMode === 'read_only' && !READ_METHODS.has(req.method)) {
      throw new AppError(
        'Your subscription is inactive. Renew your plan to make changes.',
        402,
      );
    }

    (req as any).accessMode = entitlements.accessMode;
    req.subscription = await resolveSubscriptionContext(account._id);
    next();
  })().catch(next);
}

/**
 * Factory: returns middleware that checks the user's role has a given permission.
 */
export function requirePermission(action: ResourceAction) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.membership) {
      next(new PermissionDeniedError('No membership context'));
      return;
    }

    if (!hasPermission(req.membership.role, action)) {
      next(new PermissionDeniedError(`Missing permission: ${action}`));
      return;
    }

    next();
  };
}

/**
 * Factory: returns middleware that checks the resolved plan has the given feature enabled.
 */
export function requireFeature(feature: keyof import('../models/plan.model').IPlan['features']) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.subscription) {
      next(new Error('Subscription context required'));
      return;
    }

    if (!isFeatureEnabled(req.subscription.plan, feature)) {
      next(new PlanFeatureNotEnabledError(feature));
      return;
    }

    next();
  };
}

/**
 * Factory: returns middleware that checks the plan limit has not been reached.
 * The countFn is called with (req) and should return the current count for the resource.
 */
export function requirePlanLimit<T extends keyof import('../models/plan.model').IPlan['limits']>(
  limit: T,
  countFn: (req: Request) => Promise<number>,
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.subscription) {
      next(new Error('Subscription context required'));
      return;
    }

    countFn(req).then((count) => {
      checkPlanLimit(req.subscription!.plan, limit, count);
      next();
    }).catch(next);
  };
}
