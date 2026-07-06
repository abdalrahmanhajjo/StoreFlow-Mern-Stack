import type { Role } from '@/store/session';

// SF-103: page + action permissions per role (mirrors the prototype matrix).
export type PageKey =
  | 'admin' | 'dashboard' | 'pos' | 'sales' | 'products' | 'categories'
  | 'inventory' | 'customers' | 'suppliers' | 'purchase-orders'
  | 'reports' | 'employees' | 'settings';

const PAGE_ACCESS: Record<Role, PageKey[]> = {
  platform_admin: ['admin'],
  owner: ['dashboard', 'pos', 'sales', 'products', 'categories', 'inventory', 'customers', 'suppliers', 'purchase-orders', 'reports', 'employees', 'settings'],
  manager: ['dashboard', 'sales', 'products', 'inventory', 'customers', 'reports', 'employees'],
  cashier: ['pos', 'sales', 'customers'],
};

export function canAccess(role: Role, page: PageKey): boolean {
  return PAGE_ACCESS[role].includes(page);
}

// Landing route after login, per role.
export function landingPath(role: Role): string {
  if (role === 'platform_admin') return '/admin/overview';
  if (role === 'cashier') return '/pos';
  return '/dashboard';
}

// Fine-grained action check (used by later sprints for employee rules).
export type Action =
  | 'product.write' | 'customer.create' | 'employee.manage'
  | 'employee.reset' | 'employee.editRole' | 'employee.delete';

export function can(role: Role, action: Action, targetRole?: Role): boolean {
  switch (action) {
    case 'product.write':
      return role === 'owner';
    case 'customer.create':
      return role === 'owner' || role === 'cashier';
    case 'employee.manage':
      return role === 'owner' || role === 'manager';
    case 'employee.reset':
      return role === 'owner';
    case 'employee.editRole':
    case 'employee.delete':
      if (role === 'owner') return true;
      if (role === 'manager') return targetRole === 'cashier';
      return false;
    default:
      return false;
  }
}
