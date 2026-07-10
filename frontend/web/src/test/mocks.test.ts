import { describe, it, expect } from 'vitest';
import { storeProfileSchema, productSummarySchema } from '@/lib/contracts/schemas';
import { BUSINESS_TYPES } from '@/lib/contracts/types';
import { MOCK_PROFILES, MOCK_PRODUCTS, getMockStore } from '@/mocks';
import { resolveStoreConfig } from '@/config/templates/registry';
import { createFormatters } from '@/lib/i18n/format';

describe('mock profiles', () => {
  it('exist for every business type and match the businessType key', () => {
    for (const t of BUSINESS_TYPES) {
      expect(MOCK_PROFILES[t]).toBeDefined();
      expect(MOCK_PROFILES[t].businessType).toBe(t);
    }
  });

  it('all validate against storeProfileSchema (strict — no over-posting)', () => {
    for (const t of BUSINESS_TYPES) {
      const r = storeProfileSchema.safeParse(MOCK_PROFILES[t]);
      expect(r.success, `${t}: ${r.success ? '' : JSON.stringify(r.error.flatten())}`).toBe(true);
    }
  });

  it('cover LTR and RTL, and distinct currencies', () => {
    const dirs = new Set(BUSINESS_TYPES.map((t) => MOCK_PROFILES[t].direction));
    expect(dirs.has('rtl')).toBe(true); // pharmacy (ar-EG)
    expect(dirs.has('ltr')).toBe(true);
    const currencies = new Set(BUSINESS_TYPES.map((t) => MOCK_PROFILES[t].currency));
    expect(currencies.size).toBeGreaterThanOrEqual(4);
  });

  it('keep pharmacy dispensing online-only by default', () => {
    expect(MOCK_PROFILES.pharmacy.complianceFlags.pharmacyDispensing).toBe(true);
    expect(MOCK_PROFILES.pharmacy.complianceFlags.offlineRegulatedAllowed).toBe(false);
  });
});

describe('mock products', () => {
  it('all validate against productSummarySchema for every business type', () => {
    for (const t of BUSINESS_TYPES) {
      for (const p of MOCK_PRODUCTS[t]) {
        const r = productSummarySchema.safeParse(p);
        expect(r.success, `${t}/${p.sku}: ${r.success ? '' : JSON.stringify(r.error.flatten())}`).toBe(true);
      }
    }
  });

  it('have unique SKUs within each catalogue', () => {
    for (const t of BUSINESS_TYPES) {
      const skus = MOCK_PRODUCTS[t].map((p) => p.sku);
      expect(new Set(skus).size).toBe(skus.length);
    }
  });

  it('include regulated/age-gated items where the workflow needs them', () => {
    expect(MOCK_PRODUCTS.pharmacy.some((p) => p.prescriptionRequired)).toBe(true);
    expect(MOCK_PRODUCTS.supermarket.some((p) => p.ageRestricted)).toBe(true);
    expect(MOCK_PRODUCTS.supermarket.some((p) => p.unit === 'kg')).toBe(true); // weighed goods
  });
});

describe('getMockStore integrates with the config + formatters', () => {
  it('resolves config and formats a product price in the store currency', () => {
    const { profile, products } = getMockStore('electronics');
    const cfg = resolveStoreConfig(profile);
    expect(cfg.template.label).toBe('Electronics');
    const fmt = createFormatters(profile.locale, profile.currency);
    // de-DE EUR formats with a euro sign and comma decimal
    expect(fmt.money(products[0].price)).toContain('€');
  });
});
