import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Subscription } from '../../models/subscription.model';
import { BillingAccount } from '../../models/billingAccount.model';
import { Plan } from '../../models/plan.model';
import { User } from '../../models/user.model';
import { Store } from '../../models/store.model';
import { logMutation } from '../../services/audit.service';
import { billingService } from '../../services/billing/billing.service';

function pubId(prefix = 'sub'): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export const listSubscriptions = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const planCode = req.query.planCode as string | undefined;
    const page = (req.query.page as string) || '1';
    const limit = (req.query.limit as string) || '20';
    const filter: any = {};

    if (status) filter.status = status;
    if (planCode) {
      const plan = await Plan.findOne({ code: planCode });
      if (plan) filter.plan = plan._id;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate('plan', 'name code')
        .populate('account')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: subscriptions,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to list subscriptions', error: error.message });
  }
};

export const getSubscriptionDetail = async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('plan')
      .populate('account');

    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    const account = await BillingAccount.findById(subscription.account);
    const user = account ? await User.findById(account.owner) : null;
    const store = user?.storeId ? await Store.findById(user.storeId).lean() : null;

    res.json({
      success: true,
      data: {
        subscription,
        account,
        user: user ? { _id: user._id, name: user.name, email: user.email } : null,
        store: store ? { _id: store._id, name: store.name, status: store.status } : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to get subscription', error: error.message });
  }
};

export const suspendSubscription = async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    subscription.status = 'suspended';
    subscription.suspendedAt = new Date();
    if (reason) subscription.metadata = { ...subscription.metadata, suspensionReason: reason };
    await subscription.save();

    logMutation(req, 'UPDATE', 'subscription', subscription._id.toString(), {
      description: `Subscription suspended: ${reason ?? 'No reason provided'}`,
      metadata: { subscriptionId: subscription.publicId, reason },
    });

    res.json({ success: true, message: 'Subscription suspended', data: { status: subscription.status } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to suspend subscription', error: error.message });
  }
};

export const reactivateSubscription = async (req: Request, res: Response) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      res.status(404).json({ success: false, message: 'Subscription not found' });
      return;
    }

    subscription.status = 'active';
    subscription.suspendedAt = undefined;
    subscription.metadata = { ...subscription.metadata, reactivationReason: req.body.reason ?? 'Admin reactivation' };
    await subscription.save();

    logMutation(req, 'UPDATE', 'subscription', subscription._id.toString(), {
      description: 'Subscription reactivated by admin',
      metadata: { subscriptionId: subscription.publicId },
    });

    res.json({ success: true, message: 'Subscription reactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to reactivate subscription', error: error.message });
  }
};

export const createManualSubscription = async (req: Request, res: Response) => {
  try {
    const { userId, planCode, billingInterval = 'monthly', reason } = req.body;

    if (!userId || !planCode) {
      res.status(400).json({ success: false, message: 'userId and planCode are required' });
      return;
    }

    const plan = await Plan.findOne({ code: planCode, isActive: true });
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found or inactive' });
      return;
    }
    if (!plan.supportedIntervals.includes(billingInterval)) {
      res.status(400).json({ success: false, message: 'Billing interval not supported' });
      return;
    }

    const account = await billingService.getOrCreateAccount(userId);
    const existingActive = await Subscription.findOne({
      account: account._id,
      status: { $in: ['active', 'trialing'] },
    });
    if (existingActive) {
      res.status(409).json({ success: false, message: 'User already has an active subscription' });
      return;
    }

    const now = new Date();
    const amountMinor = billingInterval === 'yearly' ? plan.billing.yearlyPriceMinor : plan.billing.monthlyPriceMinor;

    const subscription = await Subscription.create({
      publicId: pubId('sub'),
      account: account._id,
      user: userId,
      plan: plan._id,
      planVersion: plan.version ?? 1,
      status: 'active',
      billingInterval,
      currency: plan.billing.currency,
      amountMinor,
      provider: 'manual',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + (billingInterval === 'yearly' ? 365 : 30) * 86400000),
    });

    logMutation(req, 'CREATE', 'subscription', subscription._id.toString(), {
      description: `Manual subscription created: ${planCode} (${billingInterval})`,
      metadata: { userId, planCode, billingInterval, reason },
    });

    res.status(201).json({ success: true, message: 'Manual subscription created', data: { publicId: subscription.publicId } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create subscription', error: error.message });
  }
};

export const listBillingAccounts = async (req: Request, res: Response) => {
  try {
    const accounts = await BillingAccount.find()
      .populate({ path: 'owner', select: 'name email' })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const withSubs = await Promise.all(
      accounts.map(async (acct) => {
        const sub = await Subscription.findOne({ account: acct._id })
          .populate('plan', 'name code')
          .sort({ currentPeriodStart: -1 })
          .lean();
        return { ...acct, latestSubscription: sub ?? null };
      }),
    );

    res.json({ success: true, data: withSubs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to list accounts', error: error.message });
  }
};
