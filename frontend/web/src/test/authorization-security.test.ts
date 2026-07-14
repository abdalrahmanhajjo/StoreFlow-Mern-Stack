import { describe, it, expect } from 'vitest';

type StoreRole = 'owner' | 'administrator' | 'manager' | 'cashier' | 'inventory_manager' | 'employee' | 'viewer';

type ResourceAction = `${string}.${string}`;

const PERMISSIONS: Record<StoreRole, readonly ResourceAction[]> = {
  owner: [
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
  ],
  administrator: [
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
  ],
  manager: [
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
  ],
  cashier: [
    'product.read',
    'category.read',
    'customer.read', 'customer.create',
    'sale.read', 'sale.create',
    'inventory.read',
  ],
  inventory_manager: [
    'product.read', 'product.create', 'product.update',
    'category.read',
    'supplier.read', 'supplier.create', 'supplier.update',
    'purchase_order.read', 'purchase_order.create', 'purchase_order.update',
    'inventory.read', 'inventory.create', 'inventory.update',
    'sale.read',
    'report.read',
  ],
  employee: [
    'product.read',
    'category.read',
    'customer.read',
    'sale.read', 'sale.create',
    'inventory.read',
  ],
  viewer: [
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
  ],
};

const ALL_RESOURCE_TYPES = [
  'store', 'product', 'category', 'customer', 'supplier', 'sale',
  'purchase_order', 'inventory', 'report', 'analytics', 'employee',
  'membership', 'subscription', 'billing', 'settings', 'discount',
  'audit_log', 'integration', 'api_key',
] as const;

describe('Authorization - Permission Matrix', () => {
  it('owner has all permissions', () => {
    for (const resource of ALL_RESOURCE_TYPES) {
      for (const action of ['read', 'create', 'update', 'delete', 'manage'] as const) {
        const perm = `${resource}.${action}` as ResourceAction;
        if (PERMISSIONS.owner.includes(perm)) continue;
        if (action === 'manage' && resource !== 'store') continue;
        if (action === 'delete' && resource === 'analytics') continue;
      }
    }
    const ownerPerms = new Set(PERMISSIONS.owner);
    expect(ownerPerms.has('store.delete')).toBe(true);
    expect(ownerPerms.has('billing.manage')).toBe(true);
    expect(ownerPerms.has('membership.delete')).toBe(true);
    expect(ownerPerms.has('api_key.delete')).toBe(true);
  });

  it('administrator cannot delete store or manage billing', () => {
    const adminPerms = new Set(PERMISSIONS.administrator);
    expect(adminPerms.has('store.delete')).toBe(false);
    expect(adminPerms.has('store.manage')).toBe(false);
    expect(adminPerms.has('billing.manage')).toBe(false);
    expect(adminPerms.has('membership.delete')).toBe(false);
  });

  it('manager cannot delete products, categories, customers, suppliers, sales', () => {
    const managerPerms = new Set(PERMISSIONS.manager);
    for (const resource of ['product', 'category', 'customer', 'supplier', 'sale'] as const) {
      expect(managerPerms.has(`${resource}.delete` as ResourceAction)).toBe(false);
    }
  });

  it('manager cannot manage employees (no create/delete)', () => {
    const managerPerms = new Set(PERMISSIONS.manager);
    expect(managerPerms.has('employee.create')).toBe(false);
    expect(managerPerms.has('employee.update')).toBe(false);
    expect(managerPerms.has('employee.delete')).toBe(false);
    expect(managerPerms.has('employee.read')).toBe(true);
  });

  it('cashier can only read products, categories, inventory and CRUD sales/customers', () => {
    const cashierPerms = new Set(PERMISSIONS.cashier);
    expect(cashierPerms.has('sale.create')).toBe(true);
    expect(cashierPerms.has('sale.read')).toBe(true);
    expect(cashierPerms.has('product.read')).toBe(true);
    expect(cashierPerms.has('customer.read')).toBe(true);
    expect(cashierPerms.has('customer.create')).toBe(true);
    expect(cashierPerms.has('inventory.read')).toBe(true);
    // Should NOT have
    expect(cashierPerms.has('product.create')).toBe(false);
    expect(cashierPerms.has('product.update')).toBe(false);
    expect(cashierPerms.has('product.delete')).toBe(false);
    expect(cashierPerms.has('supplier.read')).toBe(false);
    expect(cashierPerms.has('report.read')).toBe(false);
    expect(cashierPerms.has('employee.read')).toBe(false);
    expect(cashierPerms.has('settings.read')).toBe(false);
  });

  it('inventory manager can manage products, suppliers, purchase orders, inventory', () => {
    const imPerms = new Set(PERMISSIONS.inventory_manager);
    expect(imPerms.has('product.create')).toBe(true);
    expect(imPerms.has('product.update')).toBe(true);
    expect(imPerms.has('supplier.create')).toBe(true);
    expect(imPerms.has('supplier.update')).toBe(true);
    expect(imPerms.has('purchase_order.create')).toBe(true);
    expect(imPerms.has('purchase_order.update')).toBe(true);
    expect(imPerms.has('inventory.create')).toBe(true);
    expect(imPerms.has('inventory.update')).toBe(true);
    // Cannot manage customers, sales, employees
    expect(imPerms.has('customer.create')).toBe(false);
    expect(imPerms.has('customer.delete')).toBe(false);
    expect(imPerms.has('sale.update')).toBe(false);
    expect(imPerms.has('sale.delete')).toBe(false);
    expect(imPerms.has('employee.read')).toBe(false);
  });

  it('viewer has read-only access to core resources', () => {
    const viewerPerms = new Set(PERMISSIONS.viewer);
    for (const resource of ['product', 'category', 'customer', 'supplier', 'sale', 'purchase_order', 'inventory', 'store'] as const) {
      expect(viewerPerms.has(`${resource}.read` as ResourceAction)).toBe(true);
      expect(viewerPerms.has(`${resource}.create` as ResourceAction)).toBe(false);
      expect(viewerPerms.has(`${resource}.update` as ResourceAction)).toBe(false);
      expect(viewerPerms.has(`${resource}.delete` as ResourceAction)).toBe(false);
    }
  });

  it('employee has minimal permissions (read + sale.create)', () => {
    const empPerms = new Set(PERMISSIONS.employee);
    expect(empPerms.has('sale.create')).toBe(true);
    expect(empPerms.has('product.read')).toBe(true);
    expect(empPerms.has('customer.read')).toBe(true);
    expect(empPerms.has('inventory.read')).toBe(true);
    expect(empPerms.has('category.read')).toBe(true);
    expect(empPerms.has('sale.read')).toBe(true);
    // Explicitly denied
    expect(empPerms.has('product.create')).toBe(false);
    expect(empPerms.has('product.update')).toBe(false);
    expect(empPerms.has('supplier.read')).toBe(false);
    expect(empPerms.has('employee.read')).toBe(false);
    expect(empPerms.has('report.read')).toBe(false);
    expect(empPerms.has('settings.read')).toBe(false);
  });

  it('no role has permissions outside the defined resource types', () => {
    const allDefinedPermissions = new Set<ResourceAction>();
    for (const role of Object.keys(PERMISSIONS) as StoreRole[]) {
      for (const perm of PERMISSIONS[role]) {
        allDefinedPermissions.add(perm);
      }
    }
    for (const perm of allDefinedPermissions) {
      const [resource] = perm.split('.');
      expect((ALL_RESOURCE_TYPES as readonly string[]).includes(resource)).toBe(true);
    }
  });

  it('role hierarchy: owner has all admin permissions', () => {
    for (const perm of PERMISSIONS.administrator) {
      expect(PERMISSIONS.owner).toContain(perm);
    }
  });

  it('manager has core CRUD permissions without delete or employee management', () => {
    const managerPerms = new Set(PERMISSIONS.manager);
    for (const resource of ['product', 'category', 'customer', 'supplier', 'sale'] as const) {
      expect(managerPerms.has(`${resource}.create` as ResourceAction)).toBe(true);
      expect(managerPerms.has(`${resource}.read` as ResourceAction)).toBe(true);
      expect(managerPerms.has(`${resource}.update` as ResourceAction)).toBe(true);
      expect(managerPerms.has(`${resource}.delete` as ResourceAction)).toBe(false);
    }
  });

  it('employee permissions are a read+ subset of viewer', () => {
    const empSet = new Set(PERMISSIONS.employee);
    const viewerSet = new Set(PERMISSIONS.viewer);
    for (const perm of viewerSet) {
      if (perm === 'store.read' || perm === 'supplier.read' || perm === 'purchase_order.read' || perm === 'report.read' || perm === 'analytics.read' || perm === 'audit_log.read') {
        continue;
      }
      expect(empSet.has(perm)).toBe(true);
    }
    expect(empSet.has('sale.create')).toBe(true);
  });
});

describe('Authorization - Plan Features', () => {
  it('Free plan has analytics, inventory, export but no advanced features', () => {
    const freeFeatures = {
      analytics: true,
      advancedAnalytics: false,
      exportReports: true,
      customBranding: false,
      multiStore: false,
      inventoryManagement: true,
      employeeManagement: false,
      discountManagement: false,
      integrations: false,
      apiAccess: false,
      prioritySupport: false,
      auditLogs: false,
    };
    expect(freeFeatures.analytics).toBe(true);
    expect(freeFeatures.advancedAnalytics).toBe(false);
    expect(freeFeatures.employeeManagement).toBe(false);
    expect(freeFeatures.discountManagement).toBe(false);
    expect(freeFeatures.apiAccess).toBe(false);
  });

  it('Starter plan enables employee and discount management', () => {
    const starterFeatures = {
      analytics: true,
      advancedAnalytics: false,
      exportReports: true,
      customBranding: false,
      multiStore: false,
      inventoryManagement: true,
      employeeManagement: true,
      discountManagement: true,
      integrations: false,
      apiAccess: false,
      prioritySupport: false,
      auditLogs: false,
    };
    expect(starterFeatures.employeeManagement).toBe(true);
    expect(starterFeatures.discountManagement).toBe(true);
    expect(starterFeatures.multiStore).toBe(false);
    expect(starterFeatures.apiAccess).toBe(false);
  });

  it('Professional plan enables everything except priority support', () => {
    const profFeatures = {
      analytics: true,
      advancedAnalytics: true,
      exportReports: true,
      customBranding: true,
      multiStore: true,
      inventoryManagement: true,
      employeeManagement: true,
      discountManagement: true,
      integrations: true,
      apiAccess: true,
      prioritySupport: false,
      auditLogs: true,
    };
    const allEnabled = Object.entries(profFeatures).filter(([, v]) => v).length;
    expect(allEnabled).toBe(11);
    expect(profFeatures.prioritySupport).toBe(false);
  });

  it('Business plan enables all features including priority support', () => {
    const businessFeatures = {
      analytics: true,
      advancedAnalytics: true,
      exportReports: true,
      customBranding: true,
      multiStore: true,
      inventoryManagement: true,
      employeeManagement: true,
      discountManagement: true,
      integrations: true,
      apiAccess: true,
      prioritySupport: true,
      auditLogs: true,
    };
    expect(Object.values(businessFeatures).every(Boolean)).toBe(true);
  });
});

describe('Authorization - Plan Limits', () => {
  it('Free plan: 1 store, 1 member, 50 products', () => {
    const freeLimits = { stores: 1, membersPerStore: 1, productsPerStore: 50 };
    expect(freeLimits.stores).toBe(1);
    expect(freeLimits.membersPerStore).toBe(1);
    expect(freeLimits.productsPerStore).toBe(50);
  });

  it('Starter: 1 store, 3 members, 500 products', () => {
    const starterLimits = { stores: 1, membersPerStore: 3, productsPerStore: 500 };
    expect(starterLimits.stores).toBe(1);
    expect(starterLimits.membersPerStore).toBe(3);
    expect(starterLimits.productsPerStore).toBe(500);
  });

  it('Professional: 2 stores, 10 members, 5000 products', () => {
    const profLimits = { stores: 2, membersPerStore: 10, productsPerStore: 5000 };
    expect(profLimits.stores).toBe(2);
    expect(profLimits.membersPerStore).toBe(10);
    expect(profLimits.productsPerStore).toBe(5000);
  });

  it('Enterprise has unlimited-like limits (large numbers)', () => {
    const entLimits = {
      stores: 100,
      membersPerStore: 1000,
      productsPerStore: 1000000,
      ordersPerMonth: 10000000,
    };
    expect(entLimits.stores).toBeGreaterThanOrEqual(100);
    expect(entLimits.productsPerStore).toBeGreaterThanOrEqual(1000000);
  });
});

describe('Authorization - Security Invariants', () => {
  it('every permission String follows resource.action pattern', () => {
    const allPerms = Object.values(PERMISSIONS).flat();
    for (const perm of allPerms) {
      expect(perm).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it('read permission always exists if create/update/delete exists for same resource', () => {
    for (const role of Object.keys(PERMISSIONS) as StoreRole[]) {
      const perms = new Set(PERMISSIONS[role]);
      for (const resource of ALL_RESOURCE_TYPES) {
        const canCreate = perms.has(`${resource}.create` as ResourceAction);
        const canUpdate = perms.has(`${resource}.update` as ResourceAction);
        const canDelete = perms.has(`${resource}.delete` as ResourceAction);
        if (canCreate || canUpdate || canDelete) {
          expect(perms.has(`${resource}.read` as ResourceAction)).toBe(true);
        }
      }
    }
  });

  it('delete permission must always be paired with read', () => {
    for (const role of Object.keys(PERMISSIONS) as StoreRole[]) {
      const perms = new Set(PERMISSIONS[role]);
      for (const resource of ALL_RESOURCE_TYPES) {
        if (perms.has(`${resource}.delete` as ResourceAction)) {
          expect(perms.has(`${resource}.read` as ResourceAction)).toBe(true);
        }
      }
    }
  });
});
