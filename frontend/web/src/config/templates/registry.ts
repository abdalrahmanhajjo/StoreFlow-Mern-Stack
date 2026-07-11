import type {
  BusinessType,
  ComplianceFlags,
  FeatureFlags,
  HardwareProfile,
  StoreProfile,
  StoreRole,
  TaxProfile,
  TextDirection,
} from '@/lib/contracts/types';
import type { NavSection, TemplateDefinition } from './types';

// --- small builders to keep the 6 definitions readable -----------------------
const NO_HARDWARE: HardwareProfile = {
  barcodeScanner: false,
  receiptPrinter: false,
  cashDrawer: false,
  scale: false,
  cardTerminal: false,
  kitchenDisplay: false,
};
const hw = (p: Partial<HardwareProfile>): HardwareProfile => ({ ...NO_HARDWARE, ...p });
const tax = (label: string, defaultRate: number, inclusive: boolean): TaxProfile => ({
  label,
  defaultRate,
  inclusive,
});

// Common entries reused across templates (still role-gated).
const sellEntry = { id: 'pos', label: 'Point of sale', path: '/pos', roles: ['manager', 'cashier'] as StoreRole[] };
const settingsSection: NavSection = {
  id: 'admin',
  label: 'Administration',
  entries: [
    { id: 'employees', label: 'Team', path: '/employees', roles: ['admin', 'manager'] },
    { id: 'settings', label: 'Store settings', path: '/settings', roles: ['admin'] },
  ],
};

export const TEMPLATES: Record<BusinessType, TemplateDefinition> = {
  supermarket: {
    businessType: 'supermarket',
    label: 'Supermarket',
    tagline: 'High-throughput lanes, weighed goods and promotions.',
    posLayout: 'lane-grid',
    actionDensity: 'comfortable',
    basketMode: 'line-items',
    primaryWorkflow: 'scan-and-bag',
    capabilities: {
      weighing: true,
      prescriptionGate: false,
      ageVerification: true,
      tableService: false,
      kitchenTicket: false,
      serialCapture: false,
      warrantyCapture: false,
      clienteling: false,
    },
    defaultFeatureFlags: { loyalty: true, offlineQueue: true, ageVerification: true },
    defaultHardware: hw({ barcodeScanner: true, receiptPrinter: true, cashDrawer: true, scale: true, cardTerminal: true }),
    defaultTax: tax('VAT', 0, true),
    navSections: [
      { id: 'sell', label: 'Sell', entries: [sellEntry, { id: 'sales', label: 'Sales', path: '/sales', roles: ['admin', 'manager', 'cashier'] }] },
      {
        id: 'stock',
        label: 'Aisles & stock',
        entries: [
          { id: 'departments', label: 'Departments', path: '/departments', roles: ['admin', 'manager', 'inventory_clerk'] },
          { id: 'weighing', label: 'Weighed goods', path: '/weighing', roles: ['manager', 'inventory_clerk'] },
          { id: 'inventory', label: 'Inventory', path: '/inventory', roles: ['admin', 'manager', 'inventory_clerk'] },
          { id: 'promotions', label: 'Promotions', path: '/promotions', roles: ['admin', 'manager'] },
        ],
      },
      settingsSection,
    ],
  },

  pharmacy: {
    businessType: 'pharmacy',
    label: 'Pharmacy',
    tagline: 'Dispensing with safety checks and regulated stock control.',
    posLayout: 'dispense-counter',
    actionDensity: 'spacious',
    basketMode: 'patient-order',
    primaryWorkflow: 'verify-and-dispense',
    capabilities: {
      weighing: false,
      prescriptionGate: true,
      ageVerification: true,
      tableService: false,
      kitchenTicket: false,
      serialCapture: false,
      warrantyCapture: false,
      clienteling: false,
    },
    defaultFeatureFlags: { prescriptionModule: true, ageVerification: true, offlineQueue: false },
    defaultHardware: hw({ barcodeScanner: true, receiptPrinter: true, cardTerminal: true }),
    defaultTax: tax('VAT', 0, true),
    navSections: [
      {
        id: 'dispense',
        label: 'Dispensing',
        entries: [
          { id: 'dispense', label: 'Dispense', path: '/dispense', roles: ['manager', 'cashier'] },
          { id: 'prescriptions', label: 'Prescriptions', path: '/prescriptions', roles: ['manager', 'cashier'], requiresFeature: 'prescriptionModule' },
          { id: 'controlled', label: 'Controlled drugs', path: '/controlled', roles: ['admin', 'manager'], requiresCompliance: 'pharmacyDispensing' },
          { id: 'patients', label: 'Patient records', path: '/patients', roles: ['manager'] },
        ],
      },
      {
        id: 'stock',
        label: 'Stock',
        entries: [
          { id: 'inventory', label: 'Medicines', path: '/inventory', roles: ['admin', 'manager', 'inventory_clerk'] },
          { id: 'recalls', label: 'Recalls', path: '/recalls', roles: ['admin', 'manager'] },
        ],
      },
      settingsSection,
    ],
  },

  restaurant: {
    businessType: 'restaurant',
    label: 'Restaurant',
    tagline: 'Tables, courses and kitchen tickets.',
    posLayout: 'table-menu',
    actionDensity: 'comfortable',
    basketMode: 'table-courses',
    primaryWorkflow: 'order-to-table',
    capabilities: {
      weighing: false,
      prescriptionGate: false,
      ageVerification: true,
      tableService: true,
      kitchenTicket: true,
      serialCapture: false,
      warrantyCapture: false,
      clienteling: false,
    },
    defaultFeatureFlags: { tableService: true, loyalty: false, ageVerification: true },
    defaultHardware: hw({ receiptPrinter: true, cardTerminal: true, kitchenDisplay: true }),
    defaultTax: tax('Service tax', 0.1, false),
    navSections: [
      {
        id: 'service',
        label: 'Service',
        entries: [
          { id: 'tables', label: 'Tables', path: '/tables', roles: ['manager', 'cashier'], requiresFeature: 'tableService' },
          { id: 'menu', label: 'Menu', path: '/menu', roles: ['admin', 'manager'] },
          { id: 'kitchen', label: 'Kitchen', path: '/kitchen', roles: ['manager'] },
          { id: 'reservations', label: 'Reservations', path: '/reservations', roles: ['manager', 'cashier'] },
        ],
      },
      { id: 'stock', label: 'Stock', entries: [{ id: 'inventory', label: 'Ingredients', path: '/inventory', roles: ['admin', 'manager', 'inventory_clerk'] }] },
      settingsSection,
    ],
  },

  boutique: {
    businessType: 'boutique',
    label: 'Boutique',
    tagline: 'Curated collections, clienteling and alterations.',
    posLayout: 'style-catalog',
    actionDensity: 'spacious',
    basketMode: 'styled-lines',
    primaryWorkflow: 'style-and-checkout',
    capabilities: {
      weighing: false,
      prescriptionGate: false,
      ageVerification: false,
      tableService: false,
      kitchenTicket: false,
      serialCapture: false,
      warrantyCapture: false,
      clienteling: true,
    },
    defaultFeatureFlags: { loyalty: true, offlineQueue: true },
    defaultHardware: hw({ receiptPrinter: true, cardTerminal: true }),
    defaultTax: tax('Sales tax', 0.08, false),
    navSections: [
      { id: 'sell', label: 'Sell', entries: [sellEntry, { id: 'lookbook', label: 'Lookbook', path: '/lookbook', roles: ['admin', 'manager', 'cashier'] }] },
      {
        id: 'clients',
        label: 'Clienteling',
        entries: [
          { id: 'clients', label: 'Clients', path: '/clients', roles: ['manager', 'cashier'] },
          { id: 'alterations', label: 'Alterations', path: '/alterations', roles: ['manager', 'cashier'] },
        ],
      },
      { id: 'stock', label: 'Collections', entries: [{ id: 'inventory', label: 'Collections', path: '/inventory', roles: ['admin', 'manager', 'inventory_clerk'] }] },
      settingsSection,
    ],
  },

  convenience: {
    businessType: 'convenience',
    label: 'Convenience',
    tagline: 'Fast one-tap selling, top-ups and age checks.',
    posLayout: 'quick-list',
    actionDensity: 'compact',
    basketMode: 'line-items',
    primaryWorkflow: 'quick-sell',
    capabilities: {
      weighing: false,
      prescriptionGate: false,
      ageVerification: true,
      tableService: false,
      kitchenTicket: false,
      serialCapture: false,
      warrantyCapture: false,
      clienteling: false,
    },
    defaultFeatureFlags: { ageVerification: true, offlineQueue: true, loyalty: false },
    defaultHardware: hw({ barcodeScanner: true, receiptPrinter: true, cashDrawer: true, cardTerminal: true }),
    defaultTax: tax('Sales tax', 0.05, false),
    navSections: [
      {
        id: 'sell',
        label: 'Sell',
        entries: [
          { id: 'quick', label: 'Quick sell', path: '/pos', roles: ['manager', 'cashier'] },
          { id: 'topups', label: 'Top-ups', path: '/topups', roles: ['cashier', 'manager'] },
          { id: 'age', label: 'Age-restricted', path: '/age-restricted', roles: ['manager'], requiresFeature: 'ageVerification' },
        ],
      },
      { id: 'stock', label: 'Stock', entries: [{ id: 'inventory', label: 'Inventory', path: '/inventory', roles: ['admin', 'manager', 'inventory_clerk'] }] },
      settingsSection,
    ],
  },

  electronics: {
    businessType: 'electronics',
    label: 'Electronics',
    tagline: 'Specs, serial capture, warranties and repairs.',
    posLayout: 'configure-catalog',
    actionDensity: 'comfortable',
    basketMode: 'serialised-lines',
    primaryWorkflow: 'configure-and-sell',
    capabilities: {
      weighing: false,
      prescriptionGate: false,
      ageVerification: false,
      tableService: false,
      kitchenTicket: false,
      serialCapture: true,
      warrantyCapture: true,
      clienteling: true,
    },
    defaultFeatureFlags: { serialTracking: true, loyalty: true, offlineQueue: false },
    defaultHardware: hw({ barcodeScanner: true, receiptPrinter: true, cardTerminal: true }),
    defaultTax: tax('Sales tax', 0.08, false),
    navSections: [
      { id: 'sell', label: 'Sell', entries: [sellEntry, { id: 'catalog', label: 'Catalog', path: '/catalog', roles: ['admin', 'manager', 'cashier'] }] },
      {
        id: 'aftersales',
        label: 'After-sales',
        entries: [
          { id: 'serials', label: 'Serials & IMEI', path: '/serials', roles: ['manager', 'inventory_clerk'], requiresFeature: 'serialTracking' },
          { id: 'warranties', label: 'Warranties', path: '/warranties', roles: ['manager', 'cashier'] },
          { id: 'repairs', label: 'Repairs', path: '/repairs', roles: ['manager', 'cashier'] },
        ],
      },
      settingsSection,
    ],
  },
};

// --- resolution --------------------------------------------------------------

export interface ResolvedStoreConfig {
  profile: StoreProfile;
  template: TemplateDefinition;
  effective: {
    featureFlags: FeatureFlags;
    hardware: HardwareProfile;
    tax: TaxProfile;
    complianceFlags: ComplianceFlags;
    locale: string;
    currency: string;
    direction: TextDirection;
    accent?: string;
  };
}

/**
 * Merge a business-type template with a store's profile overrides. Profile
 * values always win over template defaults. Feature flags are shallow-merged so
 * a store can toggle individual capabilities without redefining the set.
 */
export function resolveStoreConfig(profile: StoreProfile): ResolvedStoreConfig {
  const template = TEMPLATES[profile.businessType];
  return {
    profile,
    template,
    effective: {
      featureFlags: { ...template.defaultFeatureFlags, ...profile.featureFlags },
      hardware: { ...template.defaultHardware, ...profile.hardwareProfile },
      tax: profile.taxProfile ?? template.defaultTax,
      complianceFlags: profile.complianceFlags,
      locale: profile.locale,
      currency: profile.currency,
      direction: profile.direction,
      accent: profile.theme.accent,
    },
  };
}

/**
 * Role- and feature-aware navigation. An entry is shown only when the role is
 * permitted AND any required feature/compliance flag resolves true. Empty
 * sections are dropped. This is a UX affordance only — the server still
 * authorises every action behind these links.
 */
export function navForRole(config: ResolvedStoreConfig, role: StoreRole): NavSection[] {
  const { featureFlags, complianceFlags } = config.effective;
  return config.template.navSections
    .map((section) => ({
      ...section,
      entries: section.entries.filter(
        (e) =>
          e.roles.includes(role) &&
          (!e.requiresFeature || featureFlags[e.requiresFeature] === true) &&
          (!e.requiresCompliance || complianceFlags[e.requiresCompliance] === true)
      ),
    }))
    .filter((section) => section.entries.length > 0);
}

/**
 * Offline gate for regulated flows. Pharmacy dispensing (and any flow marked
 * sensitive) must stay online unless the store has explicitly opted in via
 * `complianceFlags.offlineRegulatedAllowed`.
 */
export function isRegulatedFlowOfflineSafe(profile: StoreProfile): boolean {
  const regulated = profile.complianceFlags.pharmacyDispensing === true;
  if (!regulated) return true;
  return profile.complianceFlags.offlineRegulatedAllowed === true;
}
