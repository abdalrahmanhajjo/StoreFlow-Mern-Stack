import { Request, Response } from 'express';
import { Plan } from '../models/plan.model';
import { Subscription } from '../models/subscription.model';
import { Invoice } from '../models/invoice.model';
import { CheckoutAttempt } from '../models/checkoutAttempt.model';
import { billingService } from '../services/billing/billing.service';
import { entitlementService } from '../services/billing/entitlement.service';
import { getBillingProvider } from '../services/billing/provider';
import { sanitizeRedirectPath } from '../utils/security.utils';

const SAFE_RETURN_PATHS = ['/settings/billing', '/dashboard/billing', '/settings'];

export const getPublicPlans = async (_req: Request, res: Response) => {
  try {
    const plans = await Plan.find({ isActive: true, isPublic: true })
      .sort({ displayOrder: 1 })
      .select('publicId code name description shortDescription isRecommended displayOrder supportedIntervals billing trial features limits version');

    res.status(200).json({ success: true, count: plans.length, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch plans', error: error.message });
  }
};

export const getPlanBySlug = async (req: Request, res: Response) => {
  try {
    const plan = await Plan.findOne({ code: req.params.slug, isActive: true, isPublic: true })
      .select('publicId code name description shortDescription isRecommended displayOrder supportedIntervals billing trial features limits version');

    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }
    res.status(200).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch plan', error: error.message });
  }
};

export const getSubscription = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const account = await billingService.getOrCreateAccount(req.user.sub);
    // Prefer the live subscription; a superseded/abandoned one must not win
    // the sort. (Selecting `billing` plus its subpaths is a Mongoose path
    // collision — `billing` alone already includes them.)
    const planSelect = 'publicId code name features limits billing';
    const subscription = await Subscription.findOne({
      account: account._id,
      status: { $in: ['active', 'trialing'] },
    })
      .sort({ currentPeriodStart: -1 })
      .populate('plan', planSelect)
      .lean()
      ?? await Subscription.findOne({
        account: account._id,
        status: { $nin: ['expired'] },
      })
        .sort({ currentPeriodStart: -1 })
        .populate('plan', planSelect)
        .lean();

    if (!subscription) {
      res.status(200).json({ success: true, data: null, message: 'No subscription found' });
      return;
    }

    res.status(200).json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscription', error: error.message });
  }
};

export const getEntitlements = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const account = await billingService.getOrCreateAccount(req.user.sub);
    const entitlements = await entitlementService.getEntitlementsForAccount(account._id);

    res.status(200).json({ success: true, data: entitlements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch entitlements', error: error.message });
  }
};

export const getUsage = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const account = await billingService.getOrCreateAccount(req.user.sub);
    const percentages = await entitlementService.getUsagePercentages(account._id);
    const entitlements = await entitlementService.getEntitlementsForAccount(account._id);

    res.status(200).json({ success: true, data: { percentages, limits: entitlements.limits, features: entitlements.features } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch usage', error: error.message });
  }
};

export const getInvoices = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const account = await billingService.getOrCreateAccount(req.user.sub);
    const invoices = await Invoice.find({ account: account._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, count: invoices.length, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoices', error: error.message });
  }
};

export const getInvoiceByPublicId = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const account = await billingService.getOrCreateAccount(req.user.sub);
    const invoice = await Invoice.findOne({ publicId: req.params.publicId, account: account._id }).lean();

    if (!invoice) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice', error: error.message });
  }
};

export const createQuote = async (req: Request, res: Response) => {
  try {
    const { planCode, billingInterval, promotionCode } = req.body;
    const quote = await billingService.createQuote(planCode, billingInterval, promotionCode);

    res.status(200).json({
      success: true,
      data: { quoteId: `q_${Date.now()}`, ...quote, expiresAt: new Date(Date.now() + 300000) },
    });
  } catch (error: any) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create quote', error: error.message });
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { planCode, billingInterval } = req.body;
    const baseUrl = process.env.FRONTEND_URL ?? process.env.CLIENT_APP_URL ?? 'http://localhost:5175';
    const successUrl = `${baseUrl}/billing/checkout/complete?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/settings/billing`;

    const result = await billingService.createCheckoutSession(
      req.user.sub, planCode, billingInterval, successUrl, cancelUrl,
    );

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to create checkout session', error: error.message });
  }
};

export const getCheckoutStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const account = await billingService.getOrCreateAccount(req.user.sub);
    const subscription = await Subscription.findOne({ account: account._id })
      .sort({ currentPeriodStart: -1 })
      .select('status publicId')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        status: subscription?.status ?? 'none',
        subscriptionPublicId: subscription?.publicId ?? null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to check status', error: error.message });
  }
};

export const changePlan = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { planCode, billingInterval } = req.body;
    const result = await billingService.changePlan(req.user.sub, planCode, billingInterval);

    res.status(200).json({ success: true, message: 'Plan changed successfully', data: result });
  } catch (error: any) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({
        success: false,
        message: error.message,
        // Structured limit conflicts so the UI can render a resolve checklist.
        conflicts: (error as any).details?.conflicts,
      });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to change plan', error: error.message });
  }
};

export const previewChange = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { planCode, billingInterval } = req.body;
    // Independent lookups run in parallel — Atlas round trips dominate.
    const [targetPlan, account] = await Promise.all([
      Plan.findOne({ code: planCode, isActive: true }),
      billingService.getOrCreateAccount(req.user.sub),
    ]);
    if (!targetPlan) {
      res.status(404).json({ success: false, message: 'Plan not found' });
      return;
    }

    // Live usage vs the target plan's limits — the UI blocks the switch and
    // shows a resolve checklist while any conflicts remain.
    const [currentSub, limitConflicts] = await Promise.all([
      Subscription.findOne({
        account: account._id,
        status: { $in: ['active', 'trialing'] },
      }).sort({ currentPeriodStart: -1 }).populate('plan'),
      billingService.getDowngradeConflicts(account._id, targetPlan),
    ]);

    const currentPlan = (currentSub as any)?.plan;
    const currentAmount = currentSub?.amountMinor ?? 0;
    const newAmount = billingInterval === 'yearly'
      ? targetPlan.billing.yearlyPriceMinor
      : targetPlan.billing.monthlyPriceMinor;

    res.status(200).json({
      success: true,
      data: {
        currentPlan: currentPlan?.name ?? 'None',
        currentAmountMinor: currentAmount,
        currentInterval: currentSub?.billingInterval ?? 'monthly',
        newPlan: targetPlan.name,
        newAmountMinor: newAmount,
        newInterval: billingInterval,
        newPriceLabel: `$${(newAmount / 100).toFixed(2)}/${billingInterval === 'yearly' ? 'yr' : 'mo'}`,
        isDowngrade: newAmount < currentAmount,
        limitConflicts,
        featuresAdded: Object.entries(targetPlan.features)
          .filter(([k, v]) => v && !(currentPlan as any)?.features?.[k])
          .map(([k]) => k),
        featuresRemoved: Object.entries((currentPlan as any)?.features ?? {})
          .filter(([k, v]) => v && !(targetPlan.features as any)[k])
          .map(([k]) => k),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to preview change', error: error.message });
  }
};

export const scheduleDowngrade = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { planCode } = req.body;
    const result = await billingService.scheduleDowngrade(req.user.sub, planCode);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to schedule downgrade', error: error.message });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { reason } = req.body;
    const result = await billingService.cancel(req.user.sub, reason);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to cancel subscription', error: error.message });
  }
};

export const reactivateSubscription = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const result = await billingService.reactivate(req.user.sub);

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof Error && 'statusCode' in error) {
      res.status((error as any).statusCode).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Failed to reactivate subscription', error: error.message });
  }
};

export const createPortalSession = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const account = await billingService.getOrCreateAccount(req.user.sub);

    // The mock provider has no hosted portal — the card is managed on the
    // in-app payment-method page instead.
    if (getBillingProvider().name === 'mock') {
      const baseUrl = process.env.FRONTEND_URL ?? process.env.CLIENT_APP_URL ?? 'http://localhost:5175';
      res.status(200).json({ success: true, data: { url: `${baseUrl}/settings/billing/payment-method` } });
      return;
    }

    const billingCustomer = await (await import('../models/billingCustomer.model')).BillingCustomer.findOne({ account: account._id });
    if (!billingCustomer) {
      res.status(400).json({ success: false, message: 'No billing customer found. Set up a paid subscription first.' });
      return;
    }

    const returnUrlRaw = req.body.returnUrl ?? `${process.env.FRONTEND_URL ?? process.env.CLIENT_APP_URL ?? 'http://localhost:5175'}/settings/billing`;

    const safeReturn = SAFE_RETURN_PATHS.find(p => returnUrlRaw.includes(p))
      ?? '/settings/billing';
    const baseUrl = process.env.FRONTEND_URL ?? process.env.CLIENT_APP_URL ?? 'http://localhost:5175';
    const fullReturnUrl = `${baseUrl}${safeReturn}`;

    const provider = getBillingProvider();
    const session = await provider.createPortalSession({
      customerId: billingCustomer.providerCustomerId,
      returnUrl: fullReturnUrl,
    });

    res.status(200).json({ success: true, data: { url: session.url } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create portal session', error: error.message });
  }
};

export const getPlanLimits = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { default: Product } = await import('../models/product.model');
    const { default: Customer } = await import('../models/customer.model');
    const { StoreMembership } = await import('../models/storeMembership.model');
    const { Store } = await import('../models/store.model');

    // Atlas round trips dominate this endpoint — run every independent
    // query in parallel and fetch the subscription's plan via populate
    // instead of separate lookups.
    const [account, productsCount, customersCount, membersCount, storesCount] = await Promise.all([
      billingService.getOrCreateAccount(req.user.sub),
      req.storeId ? Product.countDocuments({ storeId: req.storeId, isActive: true }) : Promise.resolve(null),
      req.storeId ? Customer.countDocuments({ storeId: req.storeId, isActive: true }) : Promise.resolve(null),
      req.storeId ? StoreMembership.countDocuments({ store: req.storeId, status: 'active' }) : Promise.resolve(null),
      Store.countDocuments({ owner: req.user.sub }),
    ]);

    const currentCounts: Record<string, number> = { stores: storesCount };
    if (req.storeId) {
      currentCounts.productsPerStore = productsCount as number;
      currentCounts.customersPerStore = customersCount as number;
      currentCounts.membersPerStore = membersCount as number;
    }

    // Prefer the live subscription; fall back to the latest non-expired one
    // (grace/read-only states) so a superseded plan never shadows the real one.
    const subscription = await Subscription.findOne({
      account: account._id,
      status: { $in: ['active', 'trialing'] },
    }).sort({ currentPeriodStart: -1 }).populate('plan').lean()
      ?? await Subscription.findOne({
        account: account._id,
        status: { $nin: ['expired', 'incomplete'] },
      }).sort({ currentPeriodStart: -1 }).populate('plan').lean();
    // Accounts without a subscription record are on the free tier.
    const plan = (subscription?.plan as any)
      ?? await Plan.findOne({ code: 'free', isActive: true }).lean();

    // Entitlements derive from the subscription+plan we already loaded —
    // no second round of account/subscription fetches.
    const entitlements = subscription && subscription.plan
      ? entitlementService.contextFromSubscription(account._id.toString(), subscription, subscription.plan)
      : plan
        ? entitlementService.contextFromFreePlan(account._id.toString(), plan)
        : await entitlementService.getEntitlementsForAccount(account._id);

    const planPublicId = (plan as any)?.publicId ?? null;
    const planCode = (plan as any)?.code ?? null;
    const planName = (plan as any)?.name ?? null;

    res.status(200).json({
      success: true,
      data: {
        limits: entitlements.limits,
        features: entitlements.features,
        plan: { publicId: planPublicId, code: planCode, name: planName },
        currentCounts,
        accessMode: entitlements.accessMode,
        // Real subscription state for the billing page. Free-tier accounts
        // have no subscription record but are still "active".
        subscriptionStatus: subscription?.status ?? (plan ? 'active' : null),
        billingInterval: subscription?.billingInterval ?? 'monthly',
        amountMinor: subscription?.amountMinor ?? 0,
        currency: subscription?.currency ?? (plan as any)?.billing?.currency ?? 'USD',
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        trialEnd: subscription?.trialEnd ?? null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch plan limits', error: error.message });
  }
};

/**
 * Public, session-scoped checkout status. The session ID is an opaque
 * provider reference; the response leaks only the subscription lifecycle
 * status, so no auth is required — this lets the post-payment processing
 * page poll before the user has verified their email / logged in.
 */
export const getCheckoutSessionStatusBySession = async (req: Request, res: Response) => {
  try {
    const attempt = await CheckoutAttempt.findOne({ providerSessionId: req.params.sessionId })
      .select('status subscription')
      .lean();
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Checkout session not found' });
      return;
    }

    const subscription = attempt.subscription
      ? await Subscription.findById(attempt.subscription).select('status').lean()
      : null;

    res.status(200).json({
      success: true,
      data: {
        checkoutStatus: attempt.status,
        status: subscription?.status ?? 'none',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to check status', error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Demo checkout (mock provider only, never in production).
// Simulates Stripe's hosted checkout: a local page collects a fake card and
// "payment" is confirmed through the exact same webhook pipeline a real
// Stripe event would take. Endpoints 404 when a real provider is configured.
// ---------------------------------------------------------------------------

function demoBillingEnabled(): boolean {
  // Demo checkout is available whenever the mock provider is active — i.e. no
  // real Stripe keys are configured. This deliberately includes production
  // deployments (the hosted app is a demo product): the moment real Stripe
  // credentials are set, the provider switches and these endpoints 404.
  try {
    return getBillingProvider().name === 'mock';
  } catch {
    return false;
  }
}

export const getDemoCheckoutSession = async (req: Request, res: Response) => {
  if (!demoBillingEnabled()) {
    res.status(404).json({ success: false, message: 'Route not found' });
    return;
  }
  try {
    const attempt = await CheckoutAttempt.findOne({ providerSessionId: req.params.sessionId }).lean();
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Checkout session not found' });
      return;
    }
    const plan = await Plan.findById(attempt.plan).select('name code').lean();

    res.status(200).json({
      success: true,
      data: {
        sessionId: attempt.providerSessionId,
        status: attempt.status,
        plan: { name: plan?.name ?? 'Plan', code: plan?.code ?? '' },
        billingInterval: attempt.billingInterval,
        currency: attempt.currency,
        amountMinor: attempt.amountMinor,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to load checkout session', error: error.message });
  }
};

/** The account's stored payment method (brand/last4/expiry — never the PAN). */
export const getPaymentMethod = async (req: Request, res: Response) => {
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const account = await billingService.getOrCreateAccount(req.user.sub);
    const { BillingCustomer } = await import('../models/billingCustomer.model');
    const customer = await BillingCustomer.findOne({ account: account._id }).lean();
    res.status(200).json({
      success: true,
      data: (customer?.providerCustomerData as any)?.paymentMethod ?? null,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment method', error: error.message });
  }
};

/**
 * Updates the stored (simulated) payment method. Demo/mock provider only —
 * with real Stripe, cards are managed through the hosted billing portal.
 */
export const updateDemoPaymentMethod = async (req: Request, res: Response) => {
  if (!demoBillingEnabled()) {
    res.status(404).json({ success: false, message: 'Route not found' });
    return;
  }
  try {
    if (!req.user?.sub) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const card = parseDemoCard(req.body ?? {});
    if ('error' in card) {
      res.status(400).json({ success: false, message: card.error });
      return;
    }
    const account = await billingService.getOrCreateAccount(req.user.sub);
    await billingService.getOrCreateCustomer(account._id); // first card on file
    const { BillingCustomer } = await import('../models/billingCustomer.model');
    await BillingCustomer.updateOne(
      { account: account._id },
      { $set: { 'providerCustomerData.paymentMethod': card } },
    );
    res.status(200).json({ success: true, message: 'Payment method updated', data: card });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update payment method', error: error.message });
  }
};

/** Derives a display-ready payment method from raw (fake) card input. */
function parseDemoCard(body: Record<string, unknown>):
  | { brand: string; last4: string; expMonth: number; expYear: number }
  | { error: string } {
  const digits = String(body.cardNumber ?? '').replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(digits)) return { error: 'Enter a valid card number' };

  const expiry = String(body.expiry ?? '').replace(/\s/g, '');
  const m = expiry.match(/^(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return { error: 'Enter a valid expiry (MM/YY)' };
  const expMonth = Number(m[1]);
  const expYear = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  if (expMonth < 1 || expMonth > 12) return { error: 'Enter a valid expiry month' };
  const endOfMonth = new Date(expYear, expMonth, 0, 23, 59, 59);
  if (endOfMonth < new Date()) return { error: 'This card has expired' };

  const brand = digits.startsWith('4') ? 'Visa'
    : digits.startsWith('5') ? 'Mastercard'
    : digits.startsWith('3') ? 'Amex'
    : 'Card';
  return { brand, last4: digits.slice(-4), expMonth, expYear };
}

export const payDemoCheckoutSession = async (req: Request, res: Response) => {
  if (!demoBillingEnabled()) {
    res.status(404).json({ success: false, message: 'Route not found' });
    return;
  }
  try {
    const sessionId = String(req.params.sessionId);
    const attempt = await CheckoutAttempt.findOne({ providerSessionId: sessionId }).lean();
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Checkout session not found' });
      return;
    }
    if (attempt.status !== 'pending') {
      res.status(409).json({ success: false, message: `Checkout session is ${attempt.status}` });
      return;
    }

    // The simulated card becomes the account's stored payment method —
    // exactly what Stripe does on checkout completion.
    const card = parseDemoCard(req.body ?? {});
    if ('error' in card) {
      res.status(400).json({ success: false, message: card.error });
      return;
    }
    const { BillingCustomer } = await import('../models/billingCustomer.model');
    await BillingCustomer.updateOne(
      { account: attempt.account },
      { $set: { 'providerCustomerData.paymentMethod': card } },
    );

    const now = Math.floor(Date.now() / 1000);
    const periodDays = attempt.billingInterval === 'yearly' ? 365 : 30;

    // Deterministic event IDs → double-clicking Pay stays idempotent.
    await billingService.handleWebhookEvent({
      id: `evt_demo_pay_${sessionId}`,
      type: 'checkout.session.completed',
      created: now,
      data: {
        id: sessionId,
        subscription: `sub_demo_${sessionId}`,
        customer: `cus_demo_${sessionId}`,
        current_period_start: now,
        current_period_end: now + periodDays * 86400,
      },
    });

    // A paid checkout produces an invoice, same as Stripe's invoice.paid.
    await billingService.handleWebhookEvent({
      id: `evt_demo_invoice_${sessionId}`,
      type: 'invoice.paid',
      created: now,
      data: {
        id: `in_demo_${sessionId}`,
        subscription: `sub_demo_${sessionId}`,
        number: `DEMO-${sessionId.slice(-8).toUpperCase()}`,
        status: 'paid',
        currency: attempt.currency,
        subtotal: attempt.amountMinor,
        total: attempt.amountMinor,
        amount_paid: attempt.amountMinor,
        amount_due: 0,
        period_start: now,
        period_end: now + periodDays * 86400,
      },
    });

    res.status(200).json({ success: true, data: { status: 'processing' } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to complete demo payment', error: error.message });
  }
};

export const registerWithPlan = async (req: Request, res: Response) => {
  try {
    const { planCode, billingInterval } = req.body;
    if (!planCode || !['monthly', 'yearly'].includes(billingInterval)) {
      res.status(400).json({ success: false, message: 'planCode and billingInterval are required' });
      return;
    }

    const plan = await Plan.findOne({ code: planCode, isActive: true, isPublic: true });
    if (!plan) {
      res.status(404).json({ success: false, message: 'Plan not found or unavailable' });
      return;
    }
    if (!plan.supportedIntervals.includes(billingInterval)) {
      res.status(400).json({ success: false, message: 'Billing interval not supported for this plan' });
      return;
    }

    res.locals.selectedPlan = plan;
    res.locals.selectedBillingInterval = billingInterval;
    res.status(200).json({
      success: true,
      data: {
        plan: { name: plan.name, code: plan.code },
        billingInterval,
        requiresPayment: plan.billing.monthlyPriceMinor > 0 || plan.billing.yearlyPriceMinor > 0,
        trialDays: plan.trial.enabled ? plan.trial.durationDays : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to validate plan selection', error: error.message });
  }
};
