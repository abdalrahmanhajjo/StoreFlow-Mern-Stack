import { api } from '@/lib/axios';

/** Simple `{ success, message }` envelope returned by action endpoints. */
export interface ApiMessageResponse {
  success?: boolean;
  message?: string;
}

/** Display data for the stored card — never the full number. */
export interface PaymentMethodInfo {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface InvoiceInfo {
  publicId: string;
  number: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountDueMinor: number;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export interface BillingPortalSession {
  url: string;
}

export const billingService = {
  async getInvoices(): Promise<InvoiceInfo[]> {
    const res = await api.get('/v1/billing/invoices');
    return res.data.data ?? [];
  },
  async getInvoice(publicId: string): Promise<InvoiceInfo | null> {
    const res = await api.get(`/v1/billing/invoices/${publicId}`);
    return res.data.data ?? null;
  },
  async cancelSubscription(reason?: string): Promise<ApiMessageResponse> {
    const res = await api.post('/v1/billing/cancel', { reason });
    return res.data;
  },
  async reactivateSubscription(): Promise<ApiMessageResponse> {
    const res = await api.post('/v1/billing/reactivate');
    return res.data;
  },
  async getPaymentMethod(): Promise<PaymentMethodInfo | null> {
    const res = await api.get('/v1/billing/payment-method');
    return res.data?.data ?? null;
  },
  /** Demo/mock provider only — with real Stripe the hosted portal manages cards. */
  async updatePaymentMethod(cardNumber: string, expiry: string): Promise<PaymentMethodInfo> {
    const res = await api.put('/v1/billing/payment-method', { cardNumber, expiry });
    return res.data?.data;
  },
  /** Starts a paid checkout (upgrade / free→paid). Returns the hosted
   *  checkout URL to redirect the browser to. */
  async createCheckoutSession(
    planCode: string,
    billingInterval: 'monthly' | 'yearly',
  ): Promise<{ url: string | null }> {
    const res = await api.post('/v1/billing/checkout-sessions', { planCode, billingInterval });
    return { url: res.data?.data?.checkout?.url ?? null };
  },
  async createPortalSession(returnUrl?: string): Promise<BillingPortalSession> {
    const res = await api.post('/v1/billing/portal-sessions', { returnUrl });
    return res.data.data;
  },
};
