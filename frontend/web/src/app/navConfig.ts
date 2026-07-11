import type { Role } from '@/store/session';

export interface NavItem {
  label: string;
  path: string;
  roles: Role[];
  group: string;
}

// SF-202: data-driven, role-scoped navigation.
export const NAV: NavItem[] = [
  // Platform admin
  { label: 'Platform overview', path: '/admin/overview', roles: ['platform_admin'], group: 'Platform' },
  { label: 'Stores & tenants', path: '/admin/stores', roles: ['platform_admin'], group: 'Platform' },
  { label: 'Store approvals', path: '/admin/approvals', roles: ['platform_admin'], group: 'Platform' },
  { label: 'All users', path: '/admin/users', roles: ['platform_admin'], group: 'People' },
  { label: 'Subscription plans', path: '/admin/plans', roles: ['platform_admin'], group: 'People' },
  { label: 'Security & sessions', path: '/admin/security', roles: ['platform_admin'], group: 'Trust & safety' },
  { label: 'Audit logs', path: '/admin/audit', roles: ['platform_admin'], group: 'Trust & safety' },
  { label: 'Content moderation', path: '/admin/moderation', roles: ['platform_admin'], group: 'Trust & safety' },
  { label: 'System settings', path: '/admin/settings', roles: ['platform_admin'], group: 'System' },

  // Store
  { label: 'Dashboard', path: '/dashboard', roles: ['owner', 'manager'], group: 'Overview' },
  { label: 'Point of sale', path: '/pos', roles: ['owner', 'manager', 'cashier'], group: 'Sell' },
  { label: 'Sales & invoices', path: '/sales', roles: ['owner', 'manager', 'cashier'], group: 'Sell' },
  { label: 'Products', path: '/products', roles: ['owner', 'manager'], group: 'Catalog' },
  { label: 'Categories', path: '/categories', roles: ['owner', 'manager'], group: 'Catalog' },
  { label: 'Inventory & stock', path: '/inventory', roles: ['owner', 'manager'], group: 'Catalog' },
  { label: 'Customers', path: '/customers', roles: ['owner', 'manager', 'cashier'], group: 'Relationships' },
  { label: 'Suppliers', path: '/suppliers', roles: ['owner', 'manager'], group: 'Relationships' },
  { label: 'Purchase orders', path: '/purchase-orders', roles: ['owner', 'manager'], group: 'Relationships' },
  { label: 'Reports & analytics', path: '/reports', roles: ['owner', 'manager'], group: 'Business' },
  { label: 'Employees', path: '/employees', roles: ['owner'], group: 'Business' },
  { label: 'Store settings', path: '/settings', roles: ['owner'], group: 'Business' },
];

/** Default landing route after login, per role — single source of truth. */
export const LANDING: Record<Role, string> = {
  platform_admin: '/admin/overview',
  owner: '/dashboard',
  manager: '/dashboard',
  cashier: '/pos',
};

export function navForRole(role: Role): NavItem[] {
  return NAV.filter((i) => i.roles.includes(role));
}

export function landingRouteForRole(role: Role): string {
  return LANDING[role];
}
