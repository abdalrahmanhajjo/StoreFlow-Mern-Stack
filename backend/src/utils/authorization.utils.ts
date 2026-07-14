import { StoreRole } from '../models/storeMembership.model';

export type ResourceAction = `${string}.${string}`;

const PERMISSIONS: Record<StoreRole, Set<ResourceAction>> = {
  owner: new Set([
    'store.read', 'store.update', 'store.delete', 'store.manage',
    'product.read', 'product.create', 'product.update', 'product.delete',
    'category.read', 'category.create', 'category.update', 'category.delete',
    'customer.read', 'customer.create', 'customer.update', 'customer.delete',
    'supplier.read', 'supplier.create', 'supplier.update', 'supplier.delete',
    'sale.read', 'sale.create', 'sale.update', 'sale.delete',
    'purchase_order.read', 'purchase_order.create', 'purchase_order.update', 'purchase_order.delete',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete',
    'report.read', 'report.create',
    'analytics.read',
    'employee.read', 'employee.create', 'employee.update', 'employee.delete',
    'membership.read', 'membership.create', 'membership.update', 'membership.delete',
    'subscription.read', 'subscription.update',
    'billing.read', 'billing.manage',
    'settings.read', 'settings.update',
    'discount.read', 'discount.create', 'discount.update', 'discount.delete',
    'audit_log.read',
    'integration.read', 'integration.create', 'integration.update', 'integration.delete',
    'api_key.read', 'api_key.create', 'api_key.update', 'api_key.delete',
  ]),

  administrator: new Set([
    'store.read', 'store.update',
    'product.read', 'product.create', 'product.update', 'product.delete',
    'category.read', 'category.create', 'category.update', 'category.delete',
    'customer.read', 'customer.create', 'customer.update', 'customer.delete',
    'supplier.read', 'supplier.create', 'supplier.update', 'supplier.delete',
    'sale.read', 'sale.create', 'sale.update', 'sale.delete',
    'purchase_order.read', 'purchase_order.create', 'purchase_order.update', 'purchase_order.delete',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete',
    'report.read', 'report.create',
    'analytics.read',
    'employee.read', 'employee.create', 'employee.update', 'employee.delete',
    'membership.read', 'membership.create', 'membership.update',
    'subscription.read',
    'billing.read',
    'settings.read', 'settings.update',
    'discount.read', 'discount.create', 'discount.update', 'discount.delete',
    'audit_log.read',
    'integration.read',
  ]),

  manager: new Set([
    'product.read', 'product.create', 'product.update',
    'category.read', 'category.create', 'category.update',
    'customer.read', 'customer.create', 'customer.update',
    'supplier.read', 'supplier.create', 'supplier.update',
    'sale.read', 'sale.create', 'sale.update',
    'purchase_order.read', 'purchase_order.create', 'purchase_order.update',
    'inventory.read', 'inventory.create', 'inventory.update',
    'report.read',
    'analytics.read',
    'employee.read',
    'settings.read',
    'discount.read', 'discount.create', 'discount.update',
  ]),

  cashier: new Set([
    'product.read',
    'category.read',
    'customer.read', 'customer.create',
    'sale.read', 'sale.create',
    'inventory.read',
  ]),

  inventory_manager: new Set([
    'product.read', 'product.create', 'product.update',
    'category.read',
    'supplier.read', 'supplier.create', 'supplier.update',
    'purchase_order.read', 'purchase_order.create', 'purchase_order.update',
    'inventory.read', 'inventory.create', 'inventory.update',
    'sale.read',
    'report.read',
  ]),

  employee: new Set([
    'product.read',
    'category.read',
    'customer.read',
    'sale.read', 'sale.create',
    'inventory.read',
  ]),

  viewer: new Set([
    'store.read',
    'product.read',
    'category.read',
    'customer.read',
    'supplier.read',
    'sale.read',
    'purchase_order.read',
    'inventory.read',
    'report.read',
    'analytics.read',
    'audit_log.read',
  ]),
};

export function hasPermission(role: StoreRole, action: ResourceAction): boolean {
  return PERMISSIONS[role]?.has(action) ?? false;
}

export function getPermissionsForRole(role: StoreRole): ResourceAction[] {
  return Array.from(PERMISSIONS[role] ?? []);
}

export function requirePermission(role: StoreRole, action: ResourceAction): void {
  if (!hasPermission(role, action)) {
    throw new PermissionDeniedError(`Missing permission: ${action}`);
  }
}

export class PermissionDeniedError extends Error {
  public code = 'PERMISSION_DENIED';
  public statusCode = 403;
  constructor(message?: string) {
    super(message ?? 'Insufficient permissions');
    this.name = 'PermissionDeniedError';
  }
}

export class PlanFeatureNotEnabledError extends Error {
  public code = 'PLAN_FEATURE_NOT_ENABLED';
  public statusCode = 403;
  constructor(feature: string) {
    super(`Your plan does not include: ${feature}`);
    this.name = 'PlanFeatureNotEnabledError';
  }
}

export class PlanLimitExceededError extends Error {
  public code = 'PLAN_LIMIT_EXCEEDED';
  public statusCode = 403;
  constructor(limit: string) {
    super(`Plan limit exceeded: ${limit}`);
    this.name = 'PlanLimitExceededError';
  }
}
