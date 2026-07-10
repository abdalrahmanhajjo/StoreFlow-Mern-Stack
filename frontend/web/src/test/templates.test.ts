import { describe, it, expect } from 'vitest';
import {
  TEMPLATES,
  resolveStoreConfig,
  navForRole,
  isRegulatedFlowOfflineSafe,
} from '@/config/templates/registry';
import { BUSINESS_TYPES } from '@/lib/contracts/types';
import type { StoreProfile } from '@/lib/contracts/types';

function profile(overrides: Partial<StoreProfile> = {}): StoreProfile {
  return {
    id: 's1',
    tenantId: 't1',
    name: 'Test Store',
    businessType: 'supermarket',
    locale: 'en-GB',
    currency: 'GBP',
    direction: 'ltr',
    theme: {},
    taxProfile: { inclusive: true, defaultRate: 0.2, label: 'VAT' },
    hardwareProfile: {
      barcodeScanner: true,
      receiptPrinter: true,
      cashDrawer: true,
      scale: true,
      cardTerminal: true,
      kitchenDisplay: false,
    },
    featureFlags: {},
    complianceFlags: {},
    ...overrides,
  };
}

describe('template registry', () => {
  it('defines every business type', () => {
    for (const t of BUSINESS_TYPES) {
      expect(TEMPLATES[t]).toBeDefined();
      expect(TEMPLATES[t].businessType).toBe(t);
    }
  });

  it('gives each business type a meaningfully different POS layout and workflow', () => {
    const layouts = BUSINESS_TYPES.map((t) => TEMPLATES[t].posLayout);
    const workflows = BUSINESS_TYPES.map((t) => TEMPLATES[t].primaryWorkflow);
    // all distinct — not just re-themed
    expect(new Set(layouts).size).toBe(BUSINESS_TYPES.length);
    expect(new Set(workflows).size).toBe(BUSINESS_TYPES.length);
  });

  it('only the pharmacy gates on prescriptions', () => {
    expect(TEMPLATES.pharmacy.capabilities.prescriptionGate).toBe(true);
    expect(TEMPLATES.supermarket.capabilities.prescriptionGate).toBe(false);
  });
});

describe('resolveStoreConfig', () => {
  it('merges template feature-flag defaults with profile overrides (profile wins)', () => {
    const cfg = resolveStoreConfig(profile({ featureFlags: { loyalty: false, custom: true } }));
    // template default loyalty:true overridden to false; unknown flag preserved
    expect(cfg.effective.featureFlags.loyalty).toBe(false);
    expect(cfg.effective.featureFlags.custom).toBe(true);
    // offlineQueue default from template remains
    expect(cfg.effective.featureFlags.offlineQueue).toBe(true);
  });

  it('carries locale/currency/direction/accent from the profile', () => {
    const cfg = resolveStoreConfig(profile({ locale: 'ar-EG', currency: 'EGP', direction: 'rtl', theme: { accent: '#111111' } }));
    expect(cfg.effective).toMatchObject({ locale: 'ar-EG', currency: 'EGP', direction: 'rtl', accent: '#111111' });
  });
});

describe('navForRole', () => {
  it('hides entries a role may not use', () => {
    const cfg = resolveStoreConfig(profile());
    const cashierNav = navForRole(cfg, 'cashier').flatMap((s) => s.entries.map((e) => e.id));
    expect(cashierNav).toContain('pos');
    expect(cashierNav).not.toContain('settings'); // admin-only
  });

  it('drops feature-gated entries when the flag is off', () => {
    const off = resolveStoreConfig(profile({ businessType: 'restaurant', featureFlags: { tableService: false } }));
    const nav = navForRole(off, 'manager').flatMap((s) => s.entries.map((e) => e.id));
    expect(nav).not.toContain('tables');

    const on = resolveStoreConfig(profile({ businessType: 'restaurant', featureFlags: { tableService: true } }));
    const navOn = navForRole(on, 'manager').flatMap((s) => s.entries.map((e) => e.id));
    expect(navOn).toContain('tables');
  });

  it('drops compliance-gated entries unless the compliance flag is set', () => {
    const base = resolveStoreConfig(profile({ businessType: 'pharmacy', featureFlags: { prescriptionModule: true } }));
    expect(navForRole(base, 'manager').flatMap((s) => s.entries.map((e) => e.id))).not.toContain('controlled');

    const compliant = resolveStoreConfig(
      profile({ businessType: 'pharmacy', featureFlags: { prescriptionModule: true }, complianceFlags: { pharmacyDispensing: true } })
    );
    expect(navForRole(compliant, 'manager').flatMap((s) => s.entries.map((e) => e.id))).toContain('controlled');
  });

  it('never returns empty sections', () => {
    const cfg = resolveStoreConfig(profile());
    for (const section of navForRole(cfg, 'inventory_clerk')) {
      expect(section.entries.length).toBeGreaterThan(0);
    }
  });
});

describe('isRegulatedFlowOfflineSafe', () => {
  it('is safe for non-regulated stores', () => {
    expect(isRegulatedFlowOfflineSafe(profile())).toBe(true);
  });
  it('blocks offline pharmacy dispensing by default', () => {
    expect(isRegulatedFlowOfflineSafe(profile({ businessType: 'pharmacy', complianceFlags: { pharmacyDispensing: true } }))).toBe(false);
  });
  it('allows it only with an explicit opt-in', () => {
    expect(
      isRegulatedFlowOfflineSafe(
        profile({ businessType: 'pharmacy', complianceFlags: { pharmacyDispensing: true, offlineRegulatedAllowed: true } })
      )
    ).toBe(true);
  });
});
