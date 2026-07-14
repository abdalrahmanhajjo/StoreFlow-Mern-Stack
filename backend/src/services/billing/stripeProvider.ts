import Stripe from 'stripe';

import type {
  PaymentProvider,
  CreateCustomerInput,
  ProviderCustomer,
  CreateCheckoutSessionInput,
  ProviderCheckoutSession,
  CreatePortalSessionInput,
  ProviderPortalSession,
  ChangeSubscriptionInput,
  ProviderSubscription,
  CancelSubscriptionInput,
  CreateProductInput,
  CreatePriceInput,
  ProviderWebhookEvent,
} from './types';

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private stripe: Stripe;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required for Stripe provider');
    }
    this.stripe = new Stripe(apiKey);
  }

  async createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    const customer = await this.stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: input.metadata,
    });
    return { providerCustomerId: customer.id };
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<ProviderCheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      customer: input.customerId,
      mode: 'subscription',
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      subscription_data: input.trialDays && input.trialDays > 0
        ? { trial_period_days: input.trialDays }
        : undefined,
    }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined);

    return {
      sessionId: session.id,
      url: session.url,
      clientSecret: session.client_secret,
    };
  }

  async createPortalSession(input: CreatePortalSessionInput): Promise<ProviderPortalSession> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  async changeSubscription(input: ChangeSubscriptionInput): Promise<ProviderSubscription> {
    const subscription = await this.stripe.subscriptions.retrieve(input.providerSubscriptionId);
    if (!subscription.items.data[0]) {
      throw new Error('Subscription has no items');
    }
    const updated = await this.stripe.subscriptions.update(input.providerSubscriptionId, {
      items: [{ id: subscription.items.data[0].id, price: input.newPriceId }],
      proration_behavior: input.prorationBehavior ?? 'create_prorations',
    });
    return this.mapSubscription(updated);
  }

  async cancelSubscription(input: CancelSubscriptionInput): Promise<ProviderSubscription> {
    const updated = await this.stripe.subscriptions.update(input.providerSubscriptionId, {
      cancel_at_period_end: input.cancelAtPeriodEnd,
      cancellation_details: input.reason ? { comment: input.reason } : undefined,
    });
    return this.mapSubscription(updated);
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const updated = await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: false,
    });
    return this.mapSubscription(updated);
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    const subscription = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
    return this.mapSubscription(subscription);
  }

  verifyWebhook(rawBody: string | Buffer, signature: string): ProviderWebhookEvent {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    return {
      id: event.id,
      type: event.type,
      created: event.created,
      data: event.data.object as Record<string, any>,
    };
  }

  async createProduct(input: CreateProductInput): Promise<{ id: string }> {
    const product = await this.stripe.products.create({
      name: input.name,
      description: input.description,
      metadata: input.metadata,
    });
    return { id: product.id };
  }

  async createPrice(input: CreatePriceInput): Promise<{ id: string }> {
    const price = await this.stripe.prices.create({
      unit_amount: input.amountMinor,
      currency: input.currency.toLowerCase(),
      recurring: { interval: input.interval },
      product: input.productId,
    });
    return { id: price.id };
  }

  private mapSubscription(sub: Stripe.Subscription): ProviderSubscription {
    const firstItem = sub.items.data[0];
    return {
      id: sub.id,
      status: sub.status,
      currentPeriodStart: firstItem?.current_period_start ?? sub.start_date,
      currentPeriodEnd: firstItem?.current_period_end ?? sub.start_date,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelledAt: sub.canceled_at ?? undefined,
      trialStart: sub.trial_start ?? undefined,
      trialEnd: sub.trial_end ?? undefined,
      latestInvoice: typeof sub.latest_invoice === 'string'
        ? { id: sub.latest_invoice }
        : sub.latest_invoice
          ? { id: sub.latest_invoice.id, paymentIntentStatus: (sub.latest_invoice as any).payment_intent?.status }
          : undefined,
      metadata: sub.metadata as Record<string, string>,
    };
  }
}
