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

export class MockProvider implements PaymentProvider {
  readonly name = 'mock';

  async createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    return { providerCustomerId: `cus_mock_${Date.now()}` };
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<ProviderCheckoutSession> {
    const sessionId = `cs_mock_${Date.now()}`;
    // Point at the local simulated checkout page so the full
    // checkout → webhook → activation loop is drivable without Stripe keys.
    // The success URL is backend-generated, so its origin is trusted.
    let url: string | null = null;
    try {
      url = `${new URL(input.successUrl).origin}/billing/checkout/demo?session=${sessionId}`;
    } catch {
      url = null;
    }
    return {
      sessionId,
      url,
      clientSecret: `secret_mock_${Date.now()}`,
    };
  }

  async createPortalSession(input: CreatePortalSessionInput): Promise<ProviderPortalSession> {
    return { url: input.returnUrl };
  }

  async changeSubscription(input: ChangeSubscriptionInput): Promise<ProviderSubscription> {
    return {
      id: input.providerSubscriptionId,
      status: 'active',
      currentPeriodStart: Math.floor(Date.now() / 1000),
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 2592000,
      cancelAtPeriodEnd: false,
    };
  }

  async cancelSubscription(input: CancelSubscriptionInput): Promise<ProviderSubscription> {
    return {
      id: input.providerSubscriptionId,
      status: 'active',
      currentPeriodStart: Math.floor(Date.now() / 1000) - 864000,
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 1728000,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    };
  }

  async reactivateSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    return {
      id: providerSubscriptionId,
      status: 'active',
      currentPeriodStart: Math.floor(Date.now() / 1000) - 864000,
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 2592000,
      cancelAtPeriodEnd: false,
    };
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    return {
      id: providerSubscriptionId,
      status: 'active',
      currentPeriodStart: Math.floor(Date.now() / 1000) - 864000,
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 2592000,
      cancelAtPeriodEnd: false,
    };
  }

  verifyWebhook(rawBody: string | Buffer, signature: string): ProviderWebhookEvent {
    // The mock provider performs no signature verification, so it must never
    // process webhooks on a production deployment (e.g. Stripe keys missing).
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Mock billing provider cannot verify webhooks in production. Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.');
    }
    try {
      const parsed = JSON.parse(rawBody.toString('utf8'));
      return {
        id: parsed.id ?? `evt_mock_${Date.now()}`,
        type: parsed.type ?? 'mock.verify',
        created: parsed.created ?? Math.floor(Date.now() / 1000),
        data: parsed.data?.object ?? {},
      };
    } catch {
      return {
        id: `evt_mock_${Date.now()}`,
        type: 'mock.verify',
        created: Math.floor(Date.now() / 1000),
        data: {},
      };
    }
  }

  async createProduct(input: CreateProductInput): Promise<{ id: string }> {
    return { id: `prod_mock_${Date.now()}` };
  }

  async createPrice(input: CreatePriceInput): Promise<{ id: string }> {
    return { id: `price_mock_${Date.now()}` };
  }
}
