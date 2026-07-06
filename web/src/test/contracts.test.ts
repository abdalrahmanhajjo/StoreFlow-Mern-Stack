import { describe, it, expect } from 'vitest';
import {
  storeProfileSchema,
  productSummarySchema,
  offlineMutationSchema,
  paginationQuerySchema,
  idParamSchema,
  toApiProblem,
  parseWith,
} from '@/lib/contracts/schemas';

const validProfile = {
  id: 'store_1',
  tenantId: 'tenant_1',
  name: 'Blue Palm Market',
  businessType: 'supermarket',
  locale: 'en-GB',
  currency: 'GBP',
  direction: 'ltr',
  theme: { accent: '#2563eb', mode: 'light' },
  taxProfile: { inclusive: true, defaultRate: 0.2, label: 'VAT' },
  hardwareProfile: {
    barcodeScanner: true,
    receiptPrinter: true,
    cashDrawer: true,
    scale: true,
    cardTerminal: true,
    kitchenDisplay: false,
  },
  featureFlags: { loyalty: true, offlineQueue: true },
  complianceFlags: { ageRestrictedSales: true },
};

describe('storeProfileSchema', () => {
  it('accepts a valid profile', () => {
    expect(storeProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it('rejects over-posted / unknown fields (strict)', () => {
    const r = storeProfileSchema.safeParse({ ...validProfile, isPlatformAdmin: true });
    expect(r.success).toBe(false);
  });

  it('rejects an invalid currency and locale', () => {
    expect(storeProfileSchema.safeParse({ ...validProfile, currency: 'gbp' }).success).toBe(false);
    expect(storeProfileSchema.safeParse({ ...validProfile, locale: '!!' }).success).toBe(false);
  });

  it('rejects an invalid theme accent colour', () => {
    const r = storeProfileSchema.safeParse({ ...validProfile, theme: { accent: 'red' } });
    expect(r.success).toBe(false);
  });
});

describe('productSummarySchema', () => {
  const p = { id: 'p1', sku: 'SKU1', name: 'Milk', price: 1.2, unit: 'litre', categoryId: 'c1', stock: 10 };
  it('accepts valid and rejects negative price', () => {
    expect(productSummarySchema.safeParse(p).success).toBe(true);
    expect(productSummarySchema.safeParse({ ...p, price: -1 }).success).toBe(false);
  });
  it('rejects a bad image URL', () => {
    expect(productSummarySchema.safeParse({ ...p, imageUrl: 'not a url' }).success).toBe(false);
  });
});

describe('offlineMutationSchema', () => {
  it('accepts a queued mutation and rejects a bad status', () => {
    const m = {
      id: 'm1',
      createdAt: new Date().toISOString(),
      endpoint: '/api/sales',
      method: 'POST',
      payload: { total: 10 },
      status: 'queued',
      retries: 0,
      correlationId: 'corr_1',
      sensitive: false,
    };
    expect(offlineMutationSchema.safeParse(m).success).toBe(true);
    expect(offlineMutationSchema.safeParse({ ...m, status: 'weird' }).success).toBe(false);
  });
});

describe('param/query validators', () => {
  it('coerces pagination and falls back on bad input', () => {
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toMatchObject({ page: 3, pageSize: 50 });
    // catch() falls back rather than throwing on garbage
    expect(paginationQuerySchema.parse({ page: 'abc' }).page).toBe(1);
  });
  it('validates id params', () => {
    expect(idParamSchema.safeParse({ id: 'abc' }).success).toBe(true);
    expect(idParamSchema.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('toApiProblem', () => {
  it('passes through a valid problem', () => {
    const p = toApiProblem({ title: 'Nope', status: 403, correlationId: 'x' });
    expect(p).toMatchObject({ title: 'Nope', status: 403, correlationId: 'x' });
  });
  it('falls back safely for garbage', () => {
    expect(toApiProblem('boom', 500)).toMatchObject({ title: 'Something went wrong', status: 500 });
  });
});

describe('parseWith', () => {
  it('returns a discriminated result', () => {
    const ok = parseWith(idParamSchema, { id: 'x' });
    expect(ok.ok).toBe(true);
    const bad = parseWith(idParamSchema, { id: '' });
    expect(bad.ok).toBe(false);
  });
});
