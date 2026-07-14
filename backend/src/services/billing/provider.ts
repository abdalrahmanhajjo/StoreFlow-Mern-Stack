import type { PaymentProvider } from './types';

let provider: PaymentProvider | null = null;

export function getBillingProvider(): PaymentProvider {
  if (provider) return provider;
  const providerType = process.env.BILLING_PROVIDER ?? 'stripe';
  const useMock = providerType === 'mock'
    || process.env.USE_MOCK === 'true'
    || (providerType === 'stripe' && !process.env.STRIPE_SECRET_KEY);
  if (useMock) {
    const { MockProvider } = require('./mockProvider');
    provider = new MockProvider();
    console.log('[billing] Using MockPaymentProvider (no Stripe keys configured)');
    return provider!;
  }
  if (providerType === 'stripe') {
    const { StripeProvider } = require('./stripeProvider');
    provider = new StripeProvider();
    return provider!;
  }
  throw new Error(`Unsupported billing provider: ${providerType}`);
}

export function resetBillingProvider(): void {
  provider = null;
}

export function setBillingProvider(mock: PaymentProvider): void {
  provider = mock;
}

export type {
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
  ProviderWebhookEvent,
} from './types';
