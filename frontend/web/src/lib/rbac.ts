import type { Role } from '@/store/session';

// SF-103: page + action permissions per role (mirrors the prototype matrix).
export type PageKey =
  | 'admin' | 'dashboard' | 'pos' | 'sales' | 'products' | 'categories'
  | 'inventory' | 'customers' | 'suppliers' | 'purchase-orders'
  | 'reports' | 'employees' | 'settings';

// Single source of truth for page access. Manager runs all daily operations;
// the two owner-only concerns are staff management (employees) and finance
// config (settings). Kept in lockstep with navConfig, the router guards and
// the backend middleware.
const PAGE_ACCESS: Record<Role, PageKey[]> = {
  platform_admin: ['admin'],
  owner: ['dashboard', 'pos', 'sales', 'products', 'categories', 'inventory', 'customers', 'suppliers', 'purchase-orders', 'reports', 'employees', 'settings'],
  manager: ['dashboard', 'pos', 'sales', 'products', 'categories', 'inventory', 'customers', 'suppliers', 'purchase-orders', 'reports'],
  cashier: ['pos', 'sales', 'customers'],
};

export function canAccess(role: Role, page: PageKey): boolean {
  return PAGE_ACCESS[role].includes(page);
}

// Fine-grained action check (used by later sprints for employee rules).
export type Action =
  | 'product.write' | 'customer.create' | 'employee.manage'
  | 'employee.reset' | 'employee.editRole' | 'employee.delete';

export function can(role: Role, action: Action, _targetRole?: Role): boolean {
  switch (action) {
    case 'product.write':
      // Managers run the catalog day-to-day (matches the backend managerWrites).
      return role === 'owner' || role === 'manager';
    case 'customer.create':
      // Any store role working the counter can add a customer.
      return role === 'owner' || role === 'manager' || role === 'cashier';
    // Staff management is owner-only, matching the /api/users authorization.
    case 'employee.manage':
    case 'employee.reset':
    case 'employee.editRole':
    case 'employee.delete':
      return role === 'owner';
    default:
      return false;
  }
}
