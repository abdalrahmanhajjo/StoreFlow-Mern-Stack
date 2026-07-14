export interface CreateCustomerInput {
  email: string;
  name: string;
  metadata?: Record<string, string>;
}

export interface ProviderCustomer {
  providerCustomerId: string;
}

export interface CreateCheckoutSessionInput {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
  trialDays?: number;
}

export interface ProviderCheckoutSession {
  sessionId: string;
  url: string | null;
  clientSecret: string | null;
}

export interface CreatePortalSessionInput {
  customerId: string;
  returnUrl: string;
}

export interface ProviderPortalSession {
  url: string;
}

export interface ChangeSubscriptionInput {
  providerSubscriptionId: string;
  newPriceId: string;
  billingInterval: 'monthly' | 'yearly';
  prorationBehavior?: 'create_prorations' | 'none';
}

export interface ProviderSubscription {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: number;
  trialStart?: number;
  trialEnd?: number;
  latestInvoice?: {
    id: string;
    paymentIntentStatus?: string;
  };
  metadata?: Record<string, string>;
}

export interface CancelSubscriptionInput {
  providerSubscriptionId: string;
  cancelAtPeriodEnd: boolean;
  reason?: string;
}

export interface ProviderWebhookEvent {
  id: string;
  type: string;
  created: number;
  data: Record<string, any>;
}

export interface CreatePriceInput {
  amountMinor: number;
  currency: string;
  productId: string;
  interval: 'month' | 'year';
}

export interface CreateProductInput {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PricePreviewInput {
  priceId: string;
  quantity?: number;
}

export interface PaymentProvider {
  readonly name: string;
  createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer>;
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<ProviderCheckoutSession>;
  createPortalSession(input: CreatePortalSessionInput): Promise<ProviderPortalSession>;
  changeSubscription(input: ChangeSubscriptionInput): Promise<ProviderSubscription>;
  cancelSubscription(input: CancelSubscriptionInput): Promise<ProviderSubscription>;
  reactivateSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  verifyWebhook(rawBody: string | Buffer, signature: string): ProviderWebhookEvent;
  createProduct(input: CreateProductInput): Promise<{ id: string }>;
  createPrice(input: CreatePriceInput): Promise<{ id: string }>;
}
