// Canonical data contracts for StoreFlow. These interfaces are the single source
// of truth shared between the API client, stores, and UI. Zod schemas in
// `./schemas.ts` mirror them 1:1 and are `.strict()` so the client both parses
// untrusted responses AND rejects over-posted fields before sending.
//
// NOTE ON AUTHZ: the roles below drive *UX density and navigation only*.
// Authorisation remains server-authoritative — the client never grants access
// on the strength of a role string.

export type BusinessType =
  | 'supermarket'
  | 'pharmacy'
  | 'restaurant'
  | 'boutique'
  | 'convenience'
  | 'electronics';

export const BUSINESS_TYPES: readonly BusinessType[] = [
  'supermarket',
  'pharmacy',
  'restaurant',
  'boutique',
  'convenience',
  'electronics',
] as const;

/** Store-facing roles used to shape UX. Distinct from platform auth roles. */
export type StoreRole = 'admin' | 'manager' | 'cashier' | 'inventory_clerk' | 'customer';

export const STORE_ROLES: readonly StoreRole[] = [
  'admin',
  'manager',
  'cashier',
  'inventory_clerk',
  'customer',
] as const;

export type TextDirection = 'ltr' | 'rtl';

/** Units a product can be sold in. Weight/volume units enable scale hardware. */
export type SellUnit = 'each' | 'kg' | 'g' | 'litre' | 'ml' | 'hour';

export interface TaxProfile {
  /** true = prices already include tax (common in EU/UK retail). */
  inclusive: boolean;
  /** Default rate as a fraction, e.g. 0.2 for 20%. */
  defaultRate: number;
  /** Display label, e.g. "VAT", "Sales Tax", "GST". */
  label: string;
}

export interface HardwareProfile {
  barcodeScanner: boolean;
  receiptPrinter: boolean;
  cashDrawer: boolean;
  /** Weighing scale — enables weight-priced (kg/g) products. */
  scale: boolean;
  cardTerminal: boolean;
  kitchenDisplay: boolean;
}

/** Known feature flags; unknown keys are also permitted (see schema). */
export interface FeatureFlags {
  loyalty?: boolean;
  offlineQueue?: boolean;
  tableService?: boolean;
  prescriptionModule?: boolean;
  serialTracking?: boolean;
  ageVerification?: boolean;
  [flag: string]: boolean | undefined;
}

export interface ComplianceFlags {
  /** Pharmacy dispensing present — gates regulated workflows. */
  pharmacyDispensing?: boolean;
  /** Some SKUs require age verification at checkout. */
  ageRestrictedSales?: boolean;
  /**
   * Explicit, deliberate opt-in to allow a regulated flow offline. Defaults
   * false: regulated flows are online-only unless this is set true.
   */
  offlineRegulatedAllowed?: boolean;
}

export interface StoreTheme {
  /** CSS custom-property accent, e.g. "#2563eb". Validated as a hex colour. */
  accent?: string;
  mode?: 'light' | 'dark';
}

/** The per-store configuration that drives templates and overrides. */
export interface StoreProfile {
  id: string;
  tenantId: string;
  name: string;
  businessType: BusinessType;
  /** BCP-47 locale, e.g. "en-GB", "ar-EG". */
  locale: string;
  /** ISO 4217 currency code, e.g. "USD", "GBP", "EGP". */
  currency: string;
  direction: TextDirection;
  theme: StoreTheme;
  taxProfile: TaxProfile;
  hardwareProfile: HardwareProfile;
  featureFlags: FeatureFlags;
  complianceFlags: ComplianceFlags;
}

export interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  /** Price in currency major units (e.g. dollars, not cents). */
  price: number;
  unit: SellUnit;
  categoryId: string;
  stock: number;
  barcode?: string;
  imageUrl?: string;
  /** Per-line tax override; falls back to the store's default rate. */
  taxRate?: number;
  /** Pharmacy: true means this SKU cannot be sold without a prescription. */
  prescriptionRequired?: boolean;
  /** Age-restricted (alcohol, tobacco) — triggers verification at POS. */
  ageRestricted?: boolean;
}

export interface BasketLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: SellUnit;
  taxRate: number;
  /** Per-line discount as a fraction [0,1]. */
  lineDiscount?: number;
  prescriptionRequired?: boolean;
}

/**
 * RFC 9457 problem+json. `correlationId` links a client error to server logs.
 * `errors` carries per-field validation messages for form summaries.
 */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
}

export type OfflineMutationStatus = 'queued' | 'syncing' | 'synced' | 'failed';
export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * A write operation captured while offline, persisted in IndexedDB and replayed
 * when connectivity returns. `sensitive` mutations are never auto-synced for
 * regulated flows unless the store explicitly opted in.
 */
export interface OfflineMutation {
  id: string;
  createdAt: string; // ISO 8601
  endpoint: string;
  method: HttpMethod;
  payload: unknown;
  status: OfflineMutationStatus;
  retries: number;
  correlationId: string;
  sensitive: boolean;
  lastError?: string;
}
