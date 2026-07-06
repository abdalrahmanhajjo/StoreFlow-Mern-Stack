import { z } from 'zod';
import type {
  ApiProblem,
  BasketLine,
  OfflineMutation,
  ProductSummary,
  StoreProfile,
} from './types';
import type { BusinessType, StoreRole } from './types';
import { BUSINESS_TYPES, STORE_ROLES } from './types';

const isParsableUrl = (v: string): boolean => {
  try {
    void new URL(v);
    return true;
  } catch {
    return false;
  }
};
const isIsoDateTime = (v: string): boolean => !Number.isNaN(Date.parse(v));

// Zod schemas mirror `./types.ts`. Every object is `.strict()`: unknown keys are
// rejected, so a tampered/oversized offline payload or a malicious API response
// cannot smuggle extra fields into our state (over-posting defence).

const hexColour = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex colour');

export const businessTypeSchema = z.enum(BUSINESS_TYPES as unknown as [BusinessType, ...BusinessType[]]);
export const storeRoleSchema = z.enum(STORE_ROLES as unknown as [StoreRole, ...StoreRole[]]);
export const directionSchema = z.enum(['ltr', 'rtl']);
export const sellUnitSchema = z.enum(['each', 'kg', 'g', 'litre', 'ml', 'hour']);

export const taxProfileSchema = z
  .object({
    inclusive: z.boolean(),
    defaultRate: z.number().min(0).max(1),
    label: z.string().min(1).max(20),
  })
  .strict();

export const hardwareProfileSchema = z
  .object({
    barcodeScanner: z.boolean(),
    receiptPrinter: z.boolean(),
    cashDrawer: z.boolean(),
    scale: z.boolean(),
    cardTerminal: z.boolean(),
    kitchenDisplay: z.boolean(),
  })
  .strict();

// Feature flags: known booleans plus arbitrary boolean extensions.
export const featureFlagsSchema = z.record(z.string(), z.boolean());

export const complianceFlagsSchema = z
  .object({
    pharmacyDispensing: z.boolean().optional(),
    ageRestrictedSales: z.boolean().optional(),
    offlineRegulatedAllowed: z.boolean().optional(),
  })
  .strict();

export const storeThemeSchema = z
  .object({
    accent: hexColour.optional(),
    mode: z.enum(['light', 'dark']).optional(),
  })
  .strict();

export const storeProfileSchema = z
  .object({
    id: z.string().min(1),
    tenantId: z.string().min(1),
    name: z.string().min(1).max(120),
    businessType: businessTypeSchema,
    // Validate BCP-47 shape defensively; Intl does the heavy lifting later.
    locale: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, 'Invalid locale'),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Invalid ISO 4217 currency'),
    direction: directionSchema,
    theme: storeThemeSchema,
    taxProfile: taxProfileSchema,
    hardwareProfile: hardwareProfileSchema,
    featureFlags: featureFlagsSchema,
    complianceFlags: complianceFlagsSchema,
  })
  .strict();

export const productSummarySchema = z
  .object({
    id: z.string().min(1),
    sku: z.string().min(1).max(64),
    name: z.string().min(1).max(200),
    price: z.number().min(0).max(1_000_000),
    unit: sellUnitSchema,
    categoryId: z.string().min(1),
    stock: z.number().finite(),
    barcode: z.string().max(64).optional(),
    imageUrl: z.string().max(2048).refine(isParsableUrl, 'Invalid URL').optional(),
    taxRate: z.number().min(0).max(1).optional(),
    prescriptionRequired: z.boolean().optional(),
    ageRestricted: z.boolean().optional(),
  })
  .strict();

export const basketLineSchema = z
  .object({
    productId: z.string().min(1),
    name: z.string().min(1).max(200),
    unitPrice: z.number().min(0),
    quantity: z.number().positive().max(100_000),
    unit: sellUnitSchema,
    taxRate: z.number().min(0).max(1),
    lineDiscount: z.number().min(0).max(1).optional(),
    prescriptionRequired: z.boolean().optional(),
  })
  .strict();

export const apiProblemSchema = z
  .object({
    type: z.string().default('about:blank'),
    title: z.string().min(1),
    status: z.number().int().min(100).max(599),
    detail: z.string().optional(),
    instance: z.string().optional(),
    correlationId: z.string().optional(),
    errors: z.record(z.string(), z.array(z.string())).optional(),
  })
  // API responses may carry vendor extensions; allow but strip unknowns.
  .strip();

export const offlineMutationSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string().refine(isIsoDateTime, 'Invalid datetime'),
    endpoint: z.string().min(1),
    method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE']),
    payload: z.unknown(),
    status: z.enum(['queued', 'syncing', 'synced', 'failed']),
    retries: z.number().int().min(0),
    correlationId: z.string().min(1),
    sensitive: z.boolean(),
    lastError: z.string().optional(),
  })
  .strict();

// ---- Route / query param validators -----------------------------------------
// Route and query params are untrusted strings. Parse them at the boundary.

export const idParamSchema = z.object({ id: z.string().min(1).max(128) }).strip();

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).catch(1),
    pageSize: z.coerce.number().int().min(1).max(200).catch(25),
    q: z.string().max(200).optional().catch(undefined),
    sort: z.string().max(64).optional().catch(undefined),
  })
  .strip();

// ---- Typed parse helpers ----------------------------------------------------

/** Result-style parse so callers handle failure explicitly (no throw). */
export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: z.ZodError };

export function parseWith<T>(schema: z.ZodType<T>, value: unknown): ParseResult<T> {
  const r = schema.safeParse(value);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

/**
 * Coerce any thrown/rejected value into a safe ApiProblem so error handling is
 * uniform and never renders raw server internals.
 */
export function toApiProblem(value: unknown, fallbackStatus = 0): ApiProblem {
  const parsed = apiProblemSchema.safeParse(value);
  if (parsed.success) return parsed.data as ApiProblem;
  return {
    type: 'about:blank',
    title: 'Something went wrong',
    status: fallbackStatus,
  };
}

// Compile-time guarantee that schemas and interfaces stay in sync.
export type StoreProfileInput = z.infer<typeof storeProfileSchema>;
export type ProductSummaryInput = z.infer<typeof productSummarySchema>;
export type BasketLineInput = z.infer<typeof basketLineSchema>;
export type OfflineMutationInput = z.infer<typeof offlineMutationSchema>;

const _assertStoreProfile: StoreProfile = {} as StoreProfileInput;
const _assertProduct: ProductSummary = {} as ProductSummaryInput;
const _assertBasketLine: BasketLine = {} as BasketLineInput;
const _assertOffline: OfflineMutation = {} as OfflineMutationInput;
void _assertStoreProfile;
void _assertProduct;
void _assertBasketLine;
void _assertOffline;
