import { describe, it, expect } from 'vitest';
import { landingPath, canAccess, can } from '@/lib/rbac';
import { navForRole } from '@/app/navConfig';

describe('rbac', () => {
  it('routes each role to its landing page', () => {
    expect(landingPath('platform_admin')).toBe('/admin/overview');
    expect(landingPath('cashier')).toBe('/pos');
    expect(landingPath('owner')).toBe('/dashboard');
    expect(landingPath('manager')).toBe('/dashboard');
  });

  it('scopes page access per role', () => {
    expect(canAccess('cashier', 'pos')).toBe(true);
    expect(canAccess('cashier', 'inventory')).toBe(false);
    expect(canAccess('manager', 'inventory')).toBe(true);
    expect(canAccess('owner', 'settings')).toBe(true);
    expect(canAccess('manager', 'settings')).toBe(false);
  });

  it('enforces employee action rules', () => {
    expect(can('owner', 'employee.reset')).toBe(true);
    expect(can('manager', 'employee.reset')).toBe(false);
    expect(can('manager', 'employee.editRole', 'cashier')).toBe(true);
    expect(can('manager', 'employee.editRole', 'manager')).toBe(false);
  });

  it('filters nav for cashier to POS/Sales/Customers', () => {
    const labels = navForRole('cashier').map((i) => i.label);
    expect(labels).toEqual(['Point of sale', 'Sales & invoices', 'Customers']);
  });
});
