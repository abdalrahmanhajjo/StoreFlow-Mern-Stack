import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Subscription } from '../models/subscription.model';
import { Plan } from '../models/plan.model';
import { BillingAccount } from '../models/billingAccount.model';
import { Store } from '../models/store.model';
import { StoreMembership } from '../models/storeMembership.model';
import Product from '../models/product.model';
import Customer from '../models/customer.model';
import { resolveActiveSubscription } from '../services/subscription.service';

export const getMySubscription = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const account = await BillingAccount.findOne({ owner: req.user.sub }).lean();
    if (!account) {
      res.status(200).json({ success: true, data: null, message: 'No billing account.' });
      return;
    }

    const subscription = await Subscription.findOne({
      account: account._id,
      status: { $in: ['active', 'trialing'] },
    }).sort({ currentPeriodStart: -1 }).populate('plan').lean();

    if (!subscription) {
      res.status(200).json({ success: true, data: null, message: 'No active subscription.' });
      return;
    }

    res.status(200).json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription',
      error: error.message,
    });
  }
};

export const getPlanLimits = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const account = await BillingAccount.findOne({ owner: req.user.sub }).lean();
    if (!account) {
      res.status(200).json({ success: true, data: { limits: null, features: null, plan: null, currentCounts: {} } });
      return;
    }

    const subscription = await Subscription.findOne({
      account: account._id,
    }).sort({ currentPeriodStart: -1 }).lean();

    if (!subscription) {
      res.status(200).json({ success: true, data: { limits: null, features: null, plan: null, currentCounts: {}, subscriptionStatus: null, currentPeriodEnd: null } });
      return;
    }

    const plan = await Plan.findById(subscription.plan).lean();
    if (!plan) {
      res.status(200).json({ success: true, data: { limits: null, features: null, plan: null, currentCounts: {}, subscriptionStatus: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd } });
      return;
    }

    const currentCounts: Record<string, number> = {};
    if (req.storeId) {
      currentCounts.productsPerStore = await Product.countDocuments({ storeId: req.storeId, isActive: true });
      currentCounts.customersPerStore = await Customer.countDocuments({ storeId: req.storeId, isActive: true });
      currentCounts.membersPerStore = await StoreMembership.countDocuments({ store: req.storeId, status: 'active' });
    }
    currentCounts.stores = await Store.countDocuments({ owner: req.user.sub });

    res.status(200).json({
      success: true,
      data: {
        limits: plan.limits,
        features: plan.features,
        plan: { publicId: plan.publicId, code: plan.code, name: plan.name },
        currentCounts,
        subscriptionStatus: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch plan limits',
      error: error.message,
    });
  }
};

export const changePlan = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { planCode, billingInterval } = req.body;
    if (!planCode || !['monthly', 'yearly'].includes(billingInterval)) {
      res.status(400).json({ success: false, message: 'planCode and billingInterval (monthly|yearly) are required' });
      return;
    }

    const targetPlan = await Plan.findOne({ code: planCode, isActive: true });
    if (!targetPlan) {
      res.status(404).json({ success: false, message: `Plan "${planCode}" not found or inactive` });
      return;
    }

    const userId = new mongoose.Types.ObjectId(req.user.sub);
    const account = await BillingAccount.findOne({ owner: userId }).lean();
    if (!account) {
      res.status(402).json({ success: false, message: 'No billing account found.' });
      return;
    }

    // Load current subscription + plan for downgrade validation
    const currentContext = await resolveActiveSubscription(userId).catch(() => null);
    if (currentContext) {
      const currentPlan = currentContext.plan;

      // Detect downgrade: compare display order or stores limit
      const isDowngrade = (targetPlan.displayOrder || 99) < (currentPlan.displayOrder || 0);
      if (isDowngrade) {
        // Check stores
        const storeCount = await Store.countDocuments({ owner: req.user.sub });
        if (targetPlan.limits.stores < storeCount) {
          res.status(400).json({
            success: false,
            message: `Cannot downgrade: you have ${storeCount} store(s) but the ${targetPlan.name} plan allows only ${targetPlan.limits.stores}. Please delete or transfer stores first.`,
          });
          return;
        }

        if (req.storeId) {
          // Check products
          const productCount = await Product.countDocuments({ storeId: req.storeId, isActive: true });
          if (targetPlan.limits.productsPerStore < productCount) {
            res.status(400).json({
              success: false,
              message: `Cannot downgrade: you have ${productCount} product(s) in this store but the ${targetPlan.name} plan allows only ${targetPlan.limits.productsPerStore}. Please archive products first.`,
            });
            return;
          }

          // Check staff
          const staffCount = await StoreMembership.countDocuments({ store: req.storeId, status: 'active' });
          if (targetPlan.limits.membersPerStore < staffCount) {
            res.status(400).json({
              success: false,
              message: `Cannot downgrade: you have ${staffCount} staff member(s) in this store but the ${targetPlan.name} plan allows only ${targetPlan.limits.membersPerStore}. Please remove staff first.`,
            });
            return;
          }

          // Check customers
          const customerCount = await Customer.countDocuments({ storeId: req.storeId, isActive: true });
          if (targetPlan.limits.customersPerStore < customerCount) {
            res.status(400).json({
              success: false,
              message: `Cannot downgrade: you have ${customerCount} customer(s) in this store but the ${targetPlan.name} plan allows only ${targetPlan.limits.customersPerStore}. Please archive customers first.`,
            });
            return;
          }
        }
      }
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + (billingInterval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
    const amountMinor = billingInterval === 'yearly' ? targetPlan.billing.yearlyPriceMinor : targetPlan.billing.monthlyPriceMinor;

    let subscription = await Subscription.findOne({ account: account._id }).sort({ currentPeriodStart: -1 });

    if (subscription) {
      await Subscription.updateOne(
        { _id: subscription._id },
        {
          $set: {
            plan: targetPlan._id,
            planVersion: targetPlan.version ?? 1,
            billingInterval,
            currency: targetPlan.billing.currency,
            amountMinor,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            provider: 'manual',
            providerPriceId: null,
          },
          $unset: {
            cancelledAt: '',
            suspendedAt: '',
          },
        },
      );
      subscription = await Subscription.findById(subscription._id);
    } else {
      subscription = await Subscription.create({
        publicId: `sub_${new mongoose.Types.ObjectId().toString().slice(0, 12)}`,
        account: account._id,
        user: userId,
        plan: targetPlan._id,
        planVersion: targetPlan.version ?? 1,
        status: 'active',
        billingInterval,
        currency: targetPlan.billing.currency,
        amountMinor,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        provider: 'manual',
      });
    }

    if (!subscription) {
      res.status(500).json({ success: false, message: 'Failed to create or update subscription' });
      return;
    }
    const populated = await Subscription.findById(subscription._id).populate('plan').lean();

    res.status(200).json({
      success: true,
      message: `Plan changed to ${targetPlan.name} (${billingInterval})`,
      data: populated,
    });
  } catch (error: any) {
    const message = error.name === 'ValidationError'
      ? Object.values(error.errors ?? {}).map((e: any) => e.message).join('; ')
      : error.message;
    res.status(500).json({
      success: false,
      message: 'Failed to change plan',
      error: message,
    });
  }
};
