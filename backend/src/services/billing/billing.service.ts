import mongoose, { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Plan } from '../../models/plan.model';
import { Subscription, type SubscriptionStatus } from '../../models/subscription.model';
import { BillingAccount } from '../../models/billingAccount.model';
import type { IBillingAccount } from '../../models/billingAccount.model';
import { BillingCustomer } from '../../models/billingCustomer.model';
import { CheckoutAttempt } from '../../models/checkoutAttempt.model';
import { Invoice } from '../../models/invoice.model';
import { ProcessedWebhookEvent } from '../../models/processedWebhookEvent.model';
import { Store } from '../../models/store.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/error.utils';
import { billingMail } from '../../utils/billing-mail.utils';
import { getBillingProvider } from './provider';
import type { ProviderSubscription, ProviderWebhookEvent } from './types';

function pubId(prefix = 'sub'): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

/** A single plan limit the account's live usage exceeds. */
export interface LimitConflict {
  metric: 'stores' | 'membersPerStore' | 'productsPerStore' | 'customersPerStore';
  label: string;
  current: number;
  allowed: number;
}

export class BillingService {
  async getOrCreateAccount(userId: string | Types.ObjectId): Promise<IBillingAccount> {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404);

    let account = await BillingAccount.findOne({ owner: userId });
    if (!account) {
      account = await BillingAccount.create({
        publicId: pubId('acct'),
        owner: userId,
        name: user.name,
        email: user.email,
      });
    }
    return account;
  }

  async getOrCreateCustomer(accountId: string | Types.ObjectId): Promise<string> {
    const account = await BillingAccount.findById(accountId);
    if (!account) throw new AppError('Account not found', 404);

    const existing = await BillingCustomer.findOne({ account: accountId });
    if (existing) return existing.providerCustomerId;

    const provider = getBillingProvider();
    const customer = await provider.createCustomer({
      email: account.billingEmail ?? account.email,
      name: account.name,
      metadata: { accountId: account.publicId },
    });

    await BillingCustomer.create({
      publicId: pubId('cust'),
      account: accountId,
      provider: provider.name as any,
      providerCustomerId: customer.providerCustomerId,
    });

    return customer.providerCustomerId;
  }

  async createQuote(planCode: string, billingInterval: 'monthly' | 'yearly', promotionCode?: string) {
    const plan = await Plan.findOne({ code: planCode, isActive: true, isPublic: true });
    if (!plan) throw new AppError('Plan not found or unavailable', 404);
    if (!plan.supportedIntervals.includes(billingInterval)) {
      throw new AppError('Billing interval not supported for this plan', 400);
    }

    const amountMinor = billingInterval === 'yearly'
      ? plan.billing.yearlyPriceMinor
      : plan.billing.monthlyPriceMinor;

    return {
      plan: { name: plan.name, code: plan.code, publicId: plan.publicId },
      interval: billingInterval,
      currency: plan.billing.currency,
      subtotalMinor: amountMinor,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: amountMinor,
      trialDays: plan.trial.enabled ? plan.trial.durationDays : 0,
    };
  }

  async createCheckoutSession(
    userId: string | Types.ObjectId,
    planCode: string,
    billingInterval: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string,
    pendingStoreData?: Record<string, string>,
  ) {
    const plan = await Plan.findOne({ code: planCode, isActive: true, isPublic: true });
    if (!plan) throw new AppError('Plan not found or unavailable', 404);
    if (!plan.supportedIntervals.includes(billingInterval)) {
      throw new AppError('Billing interval not supported for this plan', 400);
    }

    const account = await this.getOrCreateAccount(userId);
    const priceId = billingInterval === 'yearly'
      ? plan.providerPriceIds?.stripe?.yearly
      : plan.providerPriceIds?.stripe?.monthly;

    const existingSub = await Subscription.findOne({
      account: account._id,
      status: { $in: ['active', 'trialing', 'past_due'] },
    });

    if (existingSub) {
      throw new AppError('An active or past-due subscription already exists for this account', 409);
    }

    const isFree = (billingInterval === 'yearly' ? plan.billing.yearlyPriceMinor : plan.billing.monthlyPriceMinor) === 0;

    if (isFree && !plan.trial.enabled) {
      return this.activateFreePlan(account._id, userId, plan, billingInterval);
    }

    let providerCustomerId: string | undefined;
    let checkoutResult: any = null;
    const idempotencyKey = `chk_${randomBytes(16).toString('hex')}`;

    if (priceId) {
      providerCustomerId = await this.getOrCreateCustomer(account._id);

      const provider = getBillingProvider();
      checkoutResult = await provider.createCheckoutSession({
        customerId: providerCustomerId,
        priceId,
        successUrl,
        cancelUrl,
        metadata: {
          accountId: account.publicId,
          planCode: plan.code,
          billingInterval,
          userId: userId.toString(),
        },
        idempotencyKey,
        trialDays: plan.trial.enabled ? plan.trial.durationDays : undefined,
      });
    }

    const amountMinor = billingInterval === 'yearly'
      ? plan.billing.yearlyPriceMinor
      : plan.billing.monthlyPriceMinor;

    const subscription = await Subscription.create({
      publicId: pubId('sub'),
      account: account._id,
      user: userId,
      plan: plan._id,
      planVersion: plan.version ?? 1,
      status: priceId ? 'incomplete' : 'pending',
      billingInterval,
      currency: plan.billing.currency,
      amountMinor,
      provider: priceId ? 'stripe' : 'none',
      providerCustomerId,
      providerSubscriptionId: undefined,
      providerPriceId: priceId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingInterval === 'yearly' ? 365 : 30) * 86400000),
      trialStart: plan.trial.enabled ? new Date() : undefined,
      trialEnd: plan.trial.enabled
        ? new Date(Date.now() + plan.trial.durationDays * 86400000)
        : undefined,
    });

    if (checkoutResult) {
      const checkoutData: any = {
        publicId: pubId('co'),
        account: account._id,
        plan: plan._id,
        subscription: subscription._id,
        billingInterval,
        currency: plan.billing.currency,
        amountMinor,
        provider: 'stripe',
        providerSessionId: checkoutResult.sessionId,
        providerSessionUrl: checkoutResult.url,
        providerClientSecret: checkoutResult.clientSecret,
        status: 'pending',
        idempotencyKey,
      };
      if (pendingStoreData) {
        checkoutData.metadata = { pendingStore: JSON.stringify(pendingStoreData) };
      }
      await CheckoutAttempt.create(checkoutData);
    }

    return {
      subscription: {
        publicId: subscription.publicId,
        status: subscription.status,
      },
      checkout: checkoutResult ? {
        sessionId: checkoutResult.sessionId,
        url: checkoutResult.url,
        clientSecret: checkoutResult.clientSecret,
      } : null,
    };
  }

  async activateFreePlan(
    accountId: Types.ObjectId,
    userId: string | Types.ObjectId,
    plan: any,
    billingInterval: 'monthly' | 'yearly',
  ) {
    const now = new Date();
    const subscription = await Subscription.create({
      publicId: pubId('sub'),
      account: accountId,
      user: userId,
      plan: plan._id,
      planVersion: plan.version ?? 1,
      status: 'active',
      billingInterval,
      currency: plan.billing.currency,
      amountMinor: 0,
      provider: 'none',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 365 * 86400000 * 10),
      trialStart: plan.trial.enabled ? now : undefined,
      trialEnd: plan.trial.enabled
        ? new Date(now.getTime() + plan.trial.durationDays * 86400000)
        : undefined,
    });

    return {
      subscription: { publicId: subscription.publicId, status: 'active' },
      checkout: null,
    };
  }

  async changePlan(
    userId: string | Types.ObjectId,
    planCode: string,
    billingInterval: 'monthly' | 'yearly',
  ) {
    const account = await this.getOrCreateAccount(userId);
    const targetPlan = await Plan.findOne({ code: planCode, isActive: true });
    if (!targetPlan) throw new AppError('Plan not found or unavailable', 404);
    if (!targetPlan.supportedIntervals.includes(billingInterval)) {
      throw new AppError('Billing interval not supported for this plan', 400);
    }

    // Big-company downgrade rule: the switch is blocked (409 + structured
    // conflicts) until usage fits the target plan. Data is never deleted.
    await this.validateDowngradeConflicts(account._id, null, targetPlan);

    let subscription = await Subscription.findOne({
      account: account._id,
      status: { $in: ['active', 'trialing', 'past_due', 'grace_period'] },
    }).sort({ currentPeriodStart: -1 });

    const amountMinor = billingInterval === 'yearly'
      ? targetPlan.billing.yearlyPriceMinor
      : targetPlan.billing.monthlyPriceMinor;
    const now = new Date();

    // Free-tier accounts have no subscription record yet — create one so the
    // plan switch is real. (A production Stripe deployment routes free→paid
    // through checkout; the mock/demo provider activates directly.)
    if (!subscription) {
      subscription = new Subscription({
        publicId: pubId('sub'),
        account: account._id,
        user: account.owner,
        plan: targetPlan._id,
        planVersion: targetPlan.version ?? 1,
        status: 'active',
        billingInterval,
        currency: targetPlan.billing.currency,
        amountMinor,
        provider: 'manual',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + (billingInterval === 'yearly' ? 365 : 30) * 86400000),
      });
    }

    const priceId = billingInterval === 'yearly'
      ? targetPlan.providerPriceIds?.stripe?.yearly
      : targetPlan.providerPriceIds?.stripe?.monthly;

    if (subscription.provider === 'stripe' && subscription.providerSubscriptionId && priceId) {
      const provider = getBillingProvider();
      await provider.changeSubscription({
        providerSubscriptionId: subscription.providerSubscriptionId,
        newPriceId: priceId,
        billingInterval,
        prorationBehavior: 'create_prorations',
      });
    }

    subscription.plan = targetPlan._id;
    subscription.planVersion = targetPlan.version ?? 1;
    subscription.billingInterval = billingInterval;
    subscription.currency = targetPlan.billing.currency;
    subscription.amountMinor = amountMinor;
    subscription.status = 'active';
    subscription.providerPriceId = priceId;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = new Date(now.getTime() + (billingInterval === 'yearly' ? 365 : 30) * 86400000);
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = undefined;
    subscription.suspendedAt = undefined;
    await subscription.save();

    billingMail.planUpgraded(account._id.toString(), targetPlan.name);

    const populated = await Subscription.findById(subscription._id).populate('plan').lean();
    return populated;
  }

  async scheduleDowngrade(
    userId: string | Types.ObjectId,
    planCode: string,
  ) {
    const account = await this.getOrCreateAccount(userId);
    const targetPlan = await Plan.findOne({ code: planCode, isActive: true });
    if (!targetPlan) throw new AppError('Plan not found or unavailable', 404);

    const subscription = await Subscription.findOne({
      account: account._id,
      status: 'active',
    }).sort({ currentPeriodStart: -1 });

    if (!subscription) throw new AppError('No active subscription found', 404);

    const currentPlan = await Plan.findById(subscription.plan);
    if (!currentPlan) throw new AppError('Current plan not found', 404);

    await this.validateDowngradeConflicts(account._id, currentPlan, targetPlan);

    subscription.metadata = {
      ...(subscription.metadata ?? {}),
      pendingDowngradePlanId: targetPlan._id.toString(),
      pendingDowngradeAt: subscription.currentPeriodEnd?.toISOString() ?? '',
    };
    await subscription.save();

    billingMail.planDowngraded(account._id.toString(), targetPlan.name, subscription.currentPeriodEnd?.toISOString().slice(0, 10) ?? '');

    return {
      message: `Downgrade to ${targetPlan.name} scheduled for ${subscription.currentPeriodEnd?.toISOString().slice(0, 10)}`,
      effectiveDate: subscription.currentPeriodEnd,
      currentPlan: currentPlan.name,
      targetPlan: targetPlan.name,
    };
  }

  async cancel(userId: string | Types.ObjectId, reason?: string) {
    const account = await this.getOrCreateAccount(userId);
    const subscription = await Subscription.findOne({
      account: account._id,
      status: 'active',
    }).select('+providerCustomerId +providerSubscriptionId').sort({ currentPeriodStart: -1 });

    if (!subscription) throw new AppError('No active subscription found', 404);

    if (subscription.provider === 'stripe' && subscription.providerSubscriptionId) {
      const provider = getBillingProvider();
      await provider.cancelSubscription({
        providerSubscriptionId: subscription.providerSubscriptionId,
        cancelAtPeriodEnd: true,
        reason,
      });
    }

    await Subscription.updateOne(
      { _id: subscription._id },
      { $set: { cancelAtPeriodEnd: true, cancellationReason: reason ?? null } }
    );

    billingMail.subscriptionCancelled(account._id.toString(), subscription.currentPeriodEnd?.toISOString().slice(0, 10) ?? '');

    return {
      message: `Subscription will be cancelled on ${subscription.currentPeriodEnd?.toISOString().slice(0, 10)}`,
      effectiveDate: subscription.currentPeriodEnd,
    };
  }

  async reactivate(userId: string | Types.ObjectId) {
    const account = await this.getOrCreateAccount(userId);
    const subscription = await Subscription.findOne({
      account: account._id,
      status: { $in: ['active', 'past_due'] },
      cancelAtPeriodEnd: true,
    }).select('+providerCustomerId +providerSubscriptionId').sort({ currentPeriodStart: -1 });

    if (!subscription) throw new AppError('No subscription scheduled for cancellation', 404);

    if (subscription.provider === 'stripe' && subscription.providerSubscriptionId) {
      const provider = getBillingProvider();
      await provider.reactivateSubscription(subscription.providerSubscriptionId);
    }

    await Subscription.updateOne(
      { _id: subscription._id },
      {
        $set: { cancelAtPeriodEnd: false },
        $unset: { cancellationReason: '', cancelledAt: '' },
      }
    );

    billingMail.subscriptionReactivated(account._id.toString());

    return { message: 'Subscription reactivated. Your plan will continue.' };
  }

  async handleWebhookEvent(event: ProviderWebhookEvent): Promise<void> {
    const existing = await ProcessedWebhookEvent.findOne({
      provider: 'stripe',
      eventId: event.id,
    });

    if (existing) {
      if (existing.status === 'processed') return;
      existing.attempts += 1;
      await existing.save();
    } else {
      await ProcessedWebhookEvent.create({
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
        status: 'received',
      });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data);
          break;
        case 'payment_intent.succeeded':
        case 'charge.refunded':
          break;
      }

      await ProcessedWebhookEvent.updateOne(
        { provider: 'stripe', eventId: event.id },
        { $set: { status: 'processed', processedAt: new Date() } },
      );
    } catch (error: any) {
      await ProcessedWebhookEvent.updateOne(
        { provider: 'stripe', eventId: event.id },
        { $set: { status: 'failed', lastError: error.message } },
      );
      throw error;
    }
  }

  private async handleCheckoutCompleted(data: any) {
    const providerSubscriptionId = data.subscription;
    const providerCustomerId = data.customer;

    if (!providerSubscriptionId) return;

    const checkoutAttempt = await CheckoutAttempt.findOne({ providerSessionId: data.id });
    if (!checkoutAttempt) return;

    const subscription = await Subscription.findById(checkoutAttempt.subscription);
    if (!subscription) return;

    subscription.status = 'active';
    subscription.providerSubscriptionId = providerSubscriptionId;
    subscription.providerCustomerId = providerCustomerId;
    subscription.currentPeriodStart = new Date((data.current_period_start ?? Date.now()) * 1000);
    subscription.currentPeriodEnd = new Date((data.current_period_end ?? Date.now()) * 1000);
    await subscription.save();

    checkoutAttempt.status = 'completed';
    checkoutAttempt.completedAt = new Date();
    await checkoutAttempt.save();

    // Send activation email
    const accountForEmail = await BillingAccount.findById(checkoutAttempt.account);
    if (accountForEmail) {
      const plan = await Plan.findById(checkoutAttempt.plan);
      if (plan) {
        billingMail.subscriptionActivated(accountForEmail._id.toString(), plan.name);
      }
    }

    // If the checkout was a registration (pending store data → create store now)
    const pendingStoreRaw = checkoutAttempt.metadata?.pendingStore;
    if (pendingStoreRaw && typeof pendingStoreRaw === 'string') {
      try {
        const pendingStore = JSON.parse(pendingStoreRaw);
        const account = await BillingAccount.findById(checkoutAttempt.account);
        if (account) {
          const user = await User.findById(account.owner);
          if (user && !user.storeId) {
            const store = await Store.create({
              publicId: new Types.ObjectId().toString(),
              name: pendingStore.name,
              slug: pendingStore.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
              address: pendingStore.address,
              businessType: pendingStore.businessType,
              currency: pendingStore.currency || 'USD',
              taxRegistrationId: pendingStore.taxRegistrationId || undefined,
              status: 'pending',
              owner: user._id,
              isVerified: false,
            });

            user.storeId = store._id;
            await user.save();

            const { StoreMembership } = await import('../../models/storeMembership.model');
            await StoreMembership.create({
              publicId: new Types.ObjectId().toString(),
              store: store._id,
              user: user._id,
              role: 'owner',
              status: 'active',
            });
          }
        }
      } catch (storeErr: any) {
        // Store creation failure shouldn't block the webhook — the store
        // can be created manually by support. But it MUST be visible: a
        // swallowed failure here leaves a paying owner with no store.
        console.error(
          `[billing] Failed to create store after checkout ${checkoutAttempt.publicId}:`,
          storeErr?.message ?? storeErr,
        );
      }
    }
  }

  private async handleSubscriptionUpdated(data: any) {
    const providerSubId = data.id;
    const subscription = await Subscription.findOne({
      providerSubscriptionId: providerSubId,
    }).populate('plan');

    if (!subscription) return;

    const plan = subscription.plan as any;
    const status = this.mapProviderStatus(data.status, subscription);
    if (status) subscription.status = status;

    if (data.cancel_at_period_end !== undefined) {
      subscription.cancelAtPeriodEnd = data.cancel_at_period_end;
    }
    if (data.canceled_at) {
      subscription.cancelledAt = new Date(data.canceled_at * 1000);
    }
    if (data.current_period_start) {
      subscription.currentPeriodStart = new Date(data.current_period_start * 1000);
    }
    if (data.current_period_end) {
      subscription.currentPeriodEnd = new Date(data.current_period_end * 1000);
    }
    if (data.trial_start) {
      subscription.trialStart = new Date(data.trial_start * 1000);
    }
    if (data.trial_end) {
      subscription.trialEnd = new Date(data.trial_end * 1000);
    }

    subscription.lastProviderSyncAt = new Date();
    await subscription.save();
  }

  private async handleSubscriptionDeleted(data: any) {
    const providerSubId = data.id;
    const subscription = await Subscription.findOne({
      providerSubscriptionId: providerSubId,
    });
    if (!subscription) return;

    subscription.status = 'expired';
    subscription.expiredAt = new Date();
    subscription.lastProviderSyncAt = new Date();
    await subscription.save();
  }

  private async handleInvoicePaid(data: any) {
    const providerInvoiceId = data.id;
    const providerSubId = data.subscription;

    if (!providerSubId) return;

    const subscription = await Subscription.findOne({ providerSubscriptionId: providerSubId });
    if (!subscription) return;

    if (data.period_start) {
      subscription.currentPeriodStart = new Date(data.period_start * 1000);
    }
    if (data.period_end) {
      subscription.currentPeriodEnd = new Date(data.period_end * 1000);
    }
    subscription.lastProviderSyncAt = new Date();
    await subscription.save();

    const existingInvoice = await Invoice.findOne({ provider: 'stripe', providerInvoiceId });
    if (existingInvoice) return;

    await Invoice.create({
      publicId: pubId('inv'),
      account: subscription.account,
      subscription: subscription._id,
      provider: 'stripe',
      providerInvoiceId,
      number: data.number,
      status: data.status ?? 'paid',
      currency: data.currency?.toUpperCase() ?? 'USD',
      subtotalMinor: data.subtotal ?? 0,
      discountMinor: data.discount?.amount ?? 0,
      taxMinor: data.tax ?? 0,
      totalMinor: data.total ?? 0,
      amountPaidMinor: data.amount_paid ?? data.total ?? 0,
      amountDueMinor: data.amount_due ?? 0,
      periodStart: data.period_start ? new Date(data.period_start * 1000) : undefined,
      periodEnd: data.period_end ? new Date(data.period_end * 1000) : undefined,
      paidAt: new Date(),
      hostedInvoiceUrl: data.hosted_invoice_url,
      receiptUrl: data.receipt_url,
    });
  }

  private async handleInvoicePaymentFailed(data: any) {
    const providerSubId = data.subscription;
    if (!providerSubId) return;

    const subscription = await Subscription.findOne({ providerSubscriptionId: providerSubId });
    if (!subscription) return;

    subscription.status = 'past_due';
    subscription.pastDueSince = new Date();
    const graceDays = parseInt(process.env.BILLING_GRACE_PERIOD_DAYS ?? '7', 10);
    subscription.gracePeriodEndsAt = new Date(Date.now() + graceDays * 86400000);
    subscription.lastProviderSyncAt = new Date();
    await subscription.save();

    // Send payment failure email
    if (subscription.account) {
      billingMail.paymentFailed(
        subscription.account.toString(),
        subscription.gracePeriodEndsAt.toISOString().slice(0, 10),
      );
    }
  }

  private mapProviderStatus(providerStatus: string, subscription: any): SubscriptionStatus | null {
    const map: Record<string, SubscriptionStatus> = {
      active: 'active',
      past_due: 'past_due',
      canceled: subscription.cancelAtPeriodEnd ? 'cancelled' : 'expired',
      incomplete: 'incomplete',
      incomplete_expired: 'expired',
      trialing: 'trialing',
      paused: 'suspended',
    };
    return map[providerStatus] ?? null;
  }

  /**
   * Compares the account's live usage against a target plan's limits.
   * Returns one entry per exceeded limit — empty means the switch is safe.
   * Data is never deleted on downgrade: the switch is blocked until the
   * owner brings usage within the target plan's limits.
   */
  async getDowngradeConflicts(
    accountId: string | Types.ObjectId,
    targetPlan: { limits: Record<string, number | null | undefined>; name?: string },
  ): Promise<LimitConflict[]> {
    const account = await BillingAccount.findById(accountId);
    if (!account) return [];

    const { default: Product } = await import('../../models/product.model');
    const { default: Customer } = await import('../../models/customer.model');
    const { StoreMembership } = await import('../../models/storeMembership.model');

    const limits = targetPlan.limits ?? {};
    const allows = (v: number | null | undefined) => v == null || v < 0; // -1/null = unlimited
    const conflicts: LimitConflict[] = [];

    const stores = await Store.find({ owner: account.owner }).select('_id').lean();

    if (!allows(limits.stores) && stores.length > (limits.stores as number)) {
      conflicts.push({ metric: 'stores', label: 'Stores', current: stores.length, allowed: limits.stores as number });
    }

    // Per-store limits: report the worst (highest) usage across the stores.
    let maxMembers = 0;
    let maxProducts = 0;
    let maxCustomers = 0;
    for (const store of stores) {
      maxMembers = Math.max(maxMembers, await StoreMembership.countDocuments({ store: store._id, status: 'active' }));
      maxProducts = Math.max(maxProducts, await Product.countDocuments({ storeId: store._id, isActive: true }));
      maxCustomers = Math.max(maxCustomers, await Customer.countDocuments({ storeId: store._id, isActive: true }));
    }

    if (!allows(limits.membersPerStore) && maxMembers > (limits.membersPerStore as number)) {
      conflicts.push({ metric: 'membersPerStore', label: 'Staff members', current: maxMembers, allowed: limits.membersPerStore as number });
    }
    if (!allows(limits.productsPerStore) && maxProducts > (limits.productsPerStore as number)) {
      conflicts.push({ metric: 'productsPerStore', label: 'Products', current: maxProducts, allowed: limits.productsPerStore as number });
    }
    if (!allows(limits.customersPerStore) && maxCustomers > (limits.customersPerStore as number)) {
      conflicts.push({ metric: 'customersPerStore', label: 'Customers', current: maxCustomers, allowed: limits.customersPerStore as number });
    }

    return conflicts;
  }

  private async validateDowngradeConflicts(
    accountId: Types.ObjectId,
    _currentPlan: any,
    targetPlan: any,
  ): Promise<void> {
    const conflicts = await this.getDowngradeConflicts(accountId, targetPlan);
    if (conflicts.length > 0) {
      const summary = conflicts
        .map((c) => `${c.label}: ${c.current} in use, ${c.allowed} allowed on ${targetPlan.name}`)
        .join('; ');
      throw new AppError(
        `Your current usage exceeds the ${targetPlan.name} plan's limits — ${summary}. Reduce usage below the limits, then try again. Nothing is deleted automatically.`,
        409,
        { conflicts },
      );
    }
  }
}

export const billingService = new BillingService();
