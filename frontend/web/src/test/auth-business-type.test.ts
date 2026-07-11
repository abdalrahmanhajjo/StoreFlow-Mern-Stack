import { describe, it, expect } from 'vitest';
import { authService } from '@/features/auth/authService';
import { BUSINESS_TYPES } from '@/lib/contracts/types';

describe('login → business type mapping', () => {
  it('infers the business type from the email domain for every type', async () => {
    for (const type of BUSINESS_TYPES) {
      const { user } = await authService.login({ email: `owner@${type}.com`, password: 'x' });
      expect(user.businessType).toBe(type);
      expect(user.role).toBe('owner');
      expect(user.storeId).toBeTruthy();
    }
  });

  it('keeps role inference from the email prefix independent of business type', async () => {
    const manager = await authService.login({ email: 'manager@pharmacy.com', password: 'x' });
    expect(manager.user.role).toBe('manager');
    expect(manager.user.businessType).toBe('pharmacy');

    const cashier = await authService.login({ email: 'cashier@restaurant.com', password: 'x' });
    expect(cashier.user.role).toBe('cashier');
    expect(cashier.user.businessType).toBe('restaurant');
  });

  it('falls back to supermarket for unrecognised domains (legacy demo logins)', async () => {
    const { user } = await authService.login({ email: 'owner@x.com', password: 'x' });
    expect(user.businessType).toBe('supermarket');
  });

  it('platform admin has no store but still carries a business type', async () => {
    const { user } = await authService.login({ email: 'admin@x.com', password: 'x' });
    expect(user.role).toBe('platform_admin');
    expect(user.storeId).toBeNull();
  });
});
