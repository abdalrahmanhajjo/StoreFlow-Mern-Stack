/**
 * API resource layer: maps between backend documents and the frontend's store
 * shapes, one section per resource. Imports nothing from the stores at runtime
 * (type-only imports), so stores can safely import this module for mutation
 * mirroring without a cycle.
 *
 * Connected mode is driven by VITE_API_BASE_URL — unset means the app runs on
 * its built-in demo seed data and none of these functions are called.
 */
import { api } from '@/lib/axios';
import type { Product, ProductInput } from '@/features/products/productsStore';
import type { Category } from '@/features/categories/categoriesStore';
import type { Customer } from '@/features/customers/customersStore';
import type { Supplier, SupplierInput, PurchaseOrder, POLine } from '@/features/suppliers/supplyStore';
import type { Sale } from '@/features/sales/salesStore';
import type { Adjustment, AdjustReason } from '@/features/inventory/inventoryStore';
import type { Employee, StaffRole } from '@/features/employees/employeesStore';

// Unit tests always run against the demo seed data, whatever .env says.
export const isConnected =
  Boolean(import.meta.env.VITE_API_BASE_URL) && import.meta.env.MODE !== 'test';

/** Big enough to pull the whole catalog of a small store in one page. */
const LIST_LIMIT = 500;

interface Envelope<T> { success: boolean; data: T }

type Doc = Record<string, any>;

const id = (doc: Doc): string => String(doc._id ?? doc.id);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const CATEGORY_EMOJIS = ['🥤', '🍞', '🥛', '🥬', '🧻', '🥫', '🧴', '📦', '🧀', '🍫'];

/** Fallback emoji per category name for older rows that predate stored emoji. */
function emojiForCategory(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return CATEGORY_EMOJIS[Math.abs(h) % CATEGORY_EMOJIS.length];
}

function mapCategory(doc: Doc): Category {
  return {
    id: id(doc),
    name: doc.name,
    emoji: doc.emoji || emojiForCategory(doc.name),
    image: doc.imageUrl ?? '',
    description: doc.description ?? '',
  };
}

export async function apiListCategories(): Promise<Category[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/categories', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapCategory);
}

export async function apiCreateCategory(input: { name: string; description?: string; emoji?: string; image?: string }): Promise<Category> {
  const { data } = await api.post<Envelope<Doc>>('/categories', {
    name: input.name,
    description: input.description || undefined,
    emoji: input.emoji || undefined,
    imageUrl: input.image || undefined,
  });
  return mapCategory(data.data);
}

export async function apiUpdateCategory(catId: string, patch: { name?: string; description?: string; emoji?: string; image?: string }): Promise<void> {
  await api.put(`/categories/${catId}`, {
    name: patch.name,
    description: patch.description,
    emoji: patch.emoji,
    ...(patch.image !== undefined ? { imageUrl: patch.image || undefined } : {}),
  });
}

export async function apiDeleteCategory(catId: string): Promise<void> {
  await api.delete(`/categories/${catId}`);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function mapProduct(doc: Doc): Product {
  const category = typeof doc.categoryId === 'object' && doc.categoryId ? doc.categoryId.name : '';
  return {
    id: id(doc),
    name: doc.name,
    sku: doc.sku,
    barcode: doc.barcode ?? '',
    price: doc.price,
    cost: doc.cost ?? 0,
    stock: doc.quantity ?? 0,
    reorderPoint: doc.reorderThreshold ?? 0,
    emoji: doc.emoji || '📦',
    image: doc.imageUrl ?? '',
    category,
  };
}

export async function apiListProducts(): Promise<Product[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/products', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapProduct);
}

/** The backend wants a categoryId; the frontend works with category names. */
function productBody(input: Partial<ProductInput>, categoryId?: string) {
  return {
    name: input.name,
    sku: input.sku,
    barcode: input.barcode || undefined,
    price: input.price,
    cost: input.cost,
    quantity: input.stock,
    reorderThreshold: input.reorderPoint,
    imageUrl: input.image || undefined,
    emoji: input.emoji || undefined,
    ...(categoryId ? { categoryId } : {}),
  };
}

export async function apiCreateProduct(input: ProductInput, categoryId: string): Promise<Product> {
  const { data } = await api.post<Envelope<Doc>>('/products', productBody(input, categoryId));
  return mapProduct(data.data);
}

export async function apiUpdateProduct(
  productId: string,
  patch: Partial<ProductInput>,
  categoryId?: string
): Promise<void> {
  const body = Object.fromEntries(
    Object.entries(productBody(patch, categoryId)).filter(([, v]) => v !== undefined)
  );
  await api.put(`/products/${productId}`, body);
}

export async function apiDeleteProduct(productId: string): Promise<void> {
  await api.delete(`/products/${productId}`);
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

function mapCustomer(doc: Doc): Customer {
  return {
    id: id(doc),
    name: doc.name,
    phone: doc.phone ?? '',
    points: doc.loyaltyPoints ?? 0,
    spent: doc.totalSpent ?? 0,
  };
}

export async function apiListCustomers(): Promise<Customer[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/customers', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapCustomer);
}

export async function apiCreateCustomer(name: string, phone?: string): Promise<Customer> {
  const { data } = await api.post<Envelope<Doc>>('/customers', {
    name,
    phone: phone || undefined,
  });
  return mapCustomer(data.data);
}

export async function apiUpdateCustomer(customerId: string, patch: { name?: string; phone?: string }): Promise<void> {
  await api.put(`/customers/${customerId}`, patch);
}

export async function apiDeleteCustomer(customerId: string): Promise<void> {
  await api.delete(`/customers/${customerId}`);
}

// ---------------------------------------------------------------------------
// Suppliers & purchase orders
// ---------------------------------------------------------------------------

function mapSupplier(doc: Doc): Supplier {
  return {
    id: id(doc),
    name: doc.name,
    phone: doc.phone ?? '',
    email: doc.email ?? '',
    address: doc.address ?? '',
  };
}

export async function apiListSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/suppliers', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapSupplier);
}

export async function apiCreateSupplier(input: SupplierInput): Promise<Supplier> {
  const { data } = await api.post<Envelope<Doc>>('/suppliers', {
    name: input.name,
    phone: input.phone || undefined,
    email: input.email || undefined,
    address: input.address || undefined,
  });
  return mapSupplier(data.data);
}

export async function apiUpdateSupplier(supplierId: string, patch: Partial<SupplierInput>): Promise<void> {
  const body = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== ''));
  await api.put(`/suppliers/${supplierId}`, body);
}

export async function apiDeleteSupplier(supplierId: string): Promise<void> {
  await api.delete(`/suppliers/${supplierId}`);
}

const shortDate = (value: string | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
};

function mapPurchaseOrder(doc: Doc): PurchaseOrder {
  return {
    id: id(doc),
    poNo: doc.orderNumber ?? id(doc),
    supplier: doc.supplierName ?? '',
    lines: (doc.items ?? []).map((it: Doc): POLine => ({
      productId: typeof it.productId === 'object' && it.productId ? id(it.productId) : String(it.productId),
      name: it.productName ?? '',
      qty: it.quantityOrdered ?? 0,
    })),
    status: doc.status === 'received' ? 'received' : 'pending',
    ordered: shortDate(doc.orderDate ?? doc.createdAt),
    expected: '—',
  };
}

export async function apiListPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/purchase-orders', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapPurchaseOrder);
}

export async function apiCreatePurchaseOrder(
  supplierId: string,
  items: { productId: string; quantityOrdered: number; unitCost: number }[]
): Promise<PurchaseOrder> {
  const { data } = await api.post<Envelope<Doc>>('/purchase-orders', { supplierId, items });
  return mapPurchaseOrder(data.data);
}

export async function apiReceivePurchaseOrder(
  poId: string,
  receivedItems: { productId: string; quantityReceived: number }[],
  receivedByName?: string
): Promise<void> {
  await api.post(`/purchase-orders/${poId}/receive`, { receivedItems, receivedByName });
}

export async function apiDeletePurchaseOrder(poId: string): Promise<void> {
  await api.delete(`/purchase-orders/${poId}`);
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

function mapSale(doc: Doc): Sale {
  return {
    id: id(doc),
    status: doc.status === 'voided' ? 'voided' : 'completed',
    invoiceNo: doc.invoiceNumber ?? id(doc),
    cashier: doc.cashierName ?? 'Cashier',
    customerName:
      typeof doc.customerId === 'object' && doc.customerId ? (doc.customerId.name ?? null) : null,
    lines: (doc.items ?? []).map((it: Doc) => ({
      name: it.productName ?? '',
      qty: it.quantity ?? 0,
      price: it.unitPrice ?? 0,
    })),
    subtotal: doc.subtotal ?? 0,
    discount: doc.discount ?? 0,
    pointsRedeemed: 0,
    tax: doc.taxAmount ?? 0,
    total: doc.total ?? 0,
    payment: doc.paymentMethod === 'card' ? 'Card' : doc.paymentMethod === 'mobile_payment' ? 'Mobile' : 'Cash',
    pointsEarned: doc.loyaltyPointsEarned ?? 0,
    createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
  };
}

export async function apiListSales(): Promise<Sale[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/sales', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapSale);
}

export interface CreateSaleInput {
  items: { productId: string; quantity: number }[];
  /** Absolute discount amount (loyalty redemption folded in). */
  discount: number;
  taxRate: number;
  paymentMethod: 'cash' | 'card';
  customerId?: string;
  cashierName?: string;
}

export async function apiCreateSale(input: CreateSaleInput): Promise<Sale> {
  const { data } = await api.post<Envelope<Doc>>('/sales', {
    items: input.items,
    discount: input.discount || undefined,
    taxRate: input.taxRate || undefined,
    paymentMethod: input.paymentMethod,
    customerId: input.customerId,
    cashierName: input.cashierName,
  });
  return mapSale(data.data);
}

/** Void a completed sale — the server restores stock and reverses loyalty. */
export async function apiVoidSale(saleId: string): Promise<Sale> {
  const { data } = await api.patch<Envelope<Doc>>(`/sales/${saleId}/void`);
  return mapSale(data.data);
}

// ---------------------------------------------------------------------------
// Stock adjustments
// ---------------------------------------------------------------------------

const ADJUST_REASONS: AdjustReason[] = ['Restock', 'Damage', 'Recount', 'Expired'];

function mapAdjustment(doc: Doc): Adjustment {
  // Reason is stored as "Restock — optional note"; split it back apart.
  const [head, ...rest] = String(doc.reason ?? '').split(' — ');
  const reason = (ADJUST_REASONS as string[]).includes(head) ? (head as AdjustReason) : 'Recount';
  const delta =
    doc.adjustmentType === 'decrease'
      ? -(doc.quantity ?? 0)
      : doc.adjustmentType === 'set'
        ? (doc.newQuantity ?? 0) - (doc.previousQuantity ?? 0)
        : (doc.quantity ?? 0);
  return {
    id: id(doc),
    productId: typeof doc.productId === 'object' && doc.productId ? id(doc.productId) : String(doc.productId),
    productName: doc.productName ?? '',
    delta,
    reason,
    note: rest.join(' — '),
    by: doc.adjustedByName ?? '',
    at: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
  };
}

export async function apiListAdjustments(): Promise<Adjustment[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/stock-adjustments', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapAdjustment);
}

export async function apiCreateAdjustment(input: {
  productId: string;
  delta: number;
  reason: AdjustReason;
  note: string;
  by: string;
}): Promise<void> {
  await api.post('/stock-adjustments', {
    productId: input.productId,
    adjustmentType: input.delta >= 0 ? 'increase' : 'decrease',
    quantity: Math.abs(input.delta),
    reason: input.note ? `${input.reason} — ${input.note}` : input.reason,
    adjustedByName: input.by || undefined,
  });
}

// ---------------------------------------------------------------------------
// Employees (staff user accounts — owner only)
// ---------------------------------------------------------------------------

function mapEmployee(doc: Doc): Employee {
  return {
    id: id(doc),
    name: doc.name,
    email: doc.email,
    role: (['owner', 'manager', 'cashier'].includes(doc.role) ? doc.role : 'cashier') as StaffRole,
    status: doc.isActive === false ? 'disabled' : 'active',
  };
}

export async function apiListEmployees(): Promise<Employee[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/users', { params: { limit: LIST_LIMIT } });
  return (data.data ?? []).map(mapEmployee);
}

export interface InviteResult {
  employee: Employee;
  /** True only if the server confirmed the invite email was actually sent. */
  emailSent: boolean;
  /** The accept-invite link, so the owner can share it if email failed. */
  inviteUrl?: string;
}

/** Invites a staff member: creates an inactive account and emails them a
 * set-password link. They appear as "disabled" until they accept. */
export async function apiInviteEmployee(input: {
  name: string;
  email: string;
  role: StaffRole;
}): Promise<InviteResult> {
  const { data } = await api.post<Envelope<Doc>>('/users/invite', {
    name: input.name,
    email: input.email,
    role: input.role,
  });
  return {
    employee: mapEmployee(data.data),
    emailSent: Boolean(data.data.emailSent),
    inviteUrl: data.data.inviteUrl,
  };
}

export async function apiUpdateEmployee(
  userId: string,
  patch: { role?: StaffRole; isActive?: boolean }
): Promise<void> {
  await api.put(`/users/${userId}`, patch);
}

export async function apiDeleteEmployee(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

// ---------------------------------------------------------------------------
// Platform admin: stores (tenants + approvals), users, security, audit
// ---------------------------------------------------------------------------

import type { Tenant, Application, Plan, PlatformUser, PlatformRole } from '@/features/admin/adminStore';
import type { Session, Attempt, AuditEntry } from '@/features/admin/securityStore';

const TENANT_COLORS = ['#4e6af0', '#0e9384', '#b54708', '#7a5af8', '#c11574', '#175cd3'];

function initialsOf(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function colorOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TENANT_COLORS[Math.abs(h) % TENANT_COLORS.length];
}

function planOf(doc: Doc): Plan {
  const raw = String(doc.subscription?.plan ?? 'free').toLowerCase();
  if (raw === 'pro') return 'Pro';
  if (raw === 'enterprise') return 'Enterprise';
  return 'Free'; // trial & free both render as the free tier
}

const TYPE_LABELS: Record<string, string> = {
  grocery: 'Supermarket',
  restaurant: 'Restaurant',
  pharmacy: 'Pharmacy',
  retail: 'Boutique',
};

const shortDay = (value: string | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
};

export interface RawStore {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  businessType: string;
  currency: string;
  /** Store's configured sales tax as a percent (e.g. 5.4 = 5.4%). */
  taxRate: number;
  status: 'pending' | 'active' | 'suspended';
  createdAt?: string;
  plan: Plan;
}

function mapStoreDoc(doc: Doc): RawStore {
  const owner = typeof doc.ownerId === 'object' && doc.ownerId ? doc.ownerId : {};
  return {
    id: id(doc),
    name: doc.storeName,
    ownerName: owner.name ?? '—',
    ownerEmail: owner.email ?? '—',
    businessType: TYPE_LABELS[doc.businessType] ?? doc.businessType,
    currency: doc.currency ?? 'USD',
    taxRate: doc.taxRate ?? 0,
    status: doc.status,
    createdAt: doc.createdAt,
    plan: planOf(doc),
  };
}

export async function apiListStoresRaw(): Promise<RawStore[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/stores');
  return (data.data ?? []).map(mapStoreDoc);
}

export function tenantFromStore(store: RawStore, userCount: number): Tenant {
  return {
    id: store.id,
    name: store.name,
    initials: initialsOf(store.name),
    color: colorOf(store.name),
    owner: store.ownerName,
    type: store.businessType,
    plan: store.plan,
    users: userCount,
    salesMtd: 0, // platform-wide sales rollup isn't exposed by the API yet
    status: store.status === 'suspended' ? 'suspended' : 'active',
  };
}

export function applicationFromStore(store: RawStore): Application {
  return {
    id: store.id,
    name: store.name,
    initials: initialsOf(store.name),
    color: colorOf(store.name),
    email: store.ownerEmail,
    type: store.businessType,
    plan: store.plan,
    submitted: shortDay(store.createdAt),
  };
}

export async function apiChangeStoreStatus(
  storeId: string,
  status: 'pending' | 'active' | 'suspended'
): Promise<void> {
  await api.post(`/stores/${storeId}/status`, { status });
}

/** Real store document for the signed-in workspace (name, currency, …). */
export async function apiGetStore(storeId: string): Promise<RawStore> {
  const { data } = await api.get<Envelope<Doc>>(`/stores/${storeId}`);
  return mapStoreDoc(data.data);
}

const ROLE_LABELS: Record<string, PlatformRole> = {
  platform_admin: 'Platform admin',
  owner: 'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
};

export async function apiListPlatformUsers(storeNames: Map<string, string>): Promise<PlatformUser[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/users');
  return (data.data ?? []).map((doc) => ({
    id: id(doc),
    name: doc.name,
    email: doc.email,
    role: ROLE_LABELS[doc.role] ?? 'Cashier',
    store: doc.storeId ? (storeNames.get(String(doc.storeId)) ?? '—') : '—',
    status: doc.isActive === false ? 'disabled' : 'active',
    lastActive: shortDay(doc.updatedAt ?? doc.createdAt),
    root: doc.role === 'platform_admin',
  }));
}

export async function apiSetUserActive(userId: string, isActive: boolean): Promise<void> {
  await api.put(`/users/${userId}`, { isActive });
}

export async function apiDeletePlatformUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

export async function apiListLoginAttempts(): Promise<Attempt[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/security/login-attempts');
  return (data.data ?? []).map((doc) => ({
    id: id(doc),
    account: doc.email,
    ip: doc.ip ?? '—',
    when: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '—',
    result: doc.success ? 'Success' : 'Failed',
  }));
}

export async function apiListSessions(): Promise<Session[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/security/sessions');
  return (data.data ?? []).map((doc) => {
    const user = typeof doc.userId === 'object' && doc.userId ? doc.userId : {};
    return {
      id: id(doc),
      user: user.name ?? '—',
      ip: '—', // not recorded on refresh tokens
      device: user.email ?? '—',
      started: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '—',
    };
  });
}



export async function apiRevokeSession(sessionId: string): Promise<void> {
  await api.patch(`/security/sessions/${sessionId}/revoke`);
}

export async function apiRevokeAllSessions(): Promise<void> {
  await api.patch('/security/sessions/revoke-all');
}

const AUDIT_KIND: Record<string, AuditEntry['kind']> = {
  Store: 'store', User: 'user', Sale: 'billing', Auth: 'auth',
};

export async function apiListAuditLogs(): Promise<AuditEntry[]> {
  const { data } = await api.get<Envelope<Doc[]>>('/audit-logs', { params: { limit: 200 } });
  return (data.data ?? []).map((doc) => ({
    id: id(doc),
    time: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '—',
    actor: doc.performedByName ?? doc.performedBy ?? 'System',
    action: doc.action ?? '—',
    target: doc.entity ?? '—',
    ip: '—',
    kind: AUDIT_KIND[doc.entity] ?? 'store',
  }));
}

// ---------------------------------------------------------------------------
// Store settings (per-store singleton)
// ---------------------------------------------------------------------------

export interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  taxRate: number;
  logoUrl: string;
  lowStockThreshold: number;
  invoicePrefix: string;
  receiptFooter: string;
}

function mapSettings(doc: Doc): StoreSettings {
  return {
    storeName: doc.storeName ?? '',
    phone: doc.phone ?? '',
    email: doc.email ?? '',
    address: doc.address ?? '',
    currency: doc.currency ?? 'USD',
    taxRate: doc.taxRate ?? 0,
    logoUrl: doc.logoUrl ?? '',
    lowStockThreshold: doc.lowStockThreshold ?? 5,
    invoicePrefix: doc.invoicePrefix ?? 'INV',
    receiptFooter: doc.receiptFooter ?? '',
  };
}

export async function apiGetStoreSettings(): Promise<StoreSettings> {
  const { data } = await api.get<Envelope<Doc>>('/store-settings');
  return mapSettings(data.data);
}

export async function apiUpdateStoreSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  // The API validates each field's format, and empty strings fail those
  // checks — omit them (clearing a field isn't supported server-side yet).
  const body = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== '' && v !== undefined)
  );
  const { data } = await api.put<Envelope<Doc>>('/store-settings', body);
  return mapSettings(data.data);
}

/** Owner-editable store profile fields (kept in sync with settings saves so
 * the shell identity, receipts and the admin tenant list stay coherent). */
export async function apiUpdateMyStore(
  storeId: string,
  patch: { storeName?: string; currency?: string; taxRate?: number; address?: string }
): Promise<void> {
  // Empty strings would fail the store document's required-field validators.
  const body = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== '' && v !== undefined)
  );
  await api.put(`/stores/${storeId}`, body);
}

// ---------------------------------------------------------------------------
// Loyalty (POS redemption)
// ---------------------------------------------------------------------------

export async function apiRedeemPoints(
  customerId: string,
  points: number,
  description: string
): Promise<void> {
  await api.post('/loyalty-ledger/redeem', { customerId, points, description });
}

/** Signed delta adjustment — used to re-credit points if a sale fails
 * after its redemption already went through. */
export async function apiAdjustPoints(
  customerId: string,
  points: number,
  description: string
): Promise<void> {
  await api.post('/loyalty-ledger/adjust', { customerId, points, description });
}
