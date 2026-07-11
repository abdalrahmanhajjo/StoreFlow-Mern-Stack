import { describe, it, expect, beforeEach } from 'vitest';
import { authService, ACCESS_TTL_SECONDS } from '@/features/auth/authService';
import { useSession } from '@/store/session';
import { decodeJwt, getExpiryMs } from '@/lib/jwt';

describe('JWT auth flow (in-memory token + refresh cookie)', () => {
  beforeEach(() => {
    document.cookie = 'sf_refresh=; path=/; max-age=0';
    useSession.getState().clear();
  });

  it('login returns a JWT access token with a future exp and sets the refresh cookie', async () => {
    const res = await authService.login({ email: 'owner@x.com', password: 'secret' });
    const claims = decodeJwt(res.accessToken);
    expect(claims?.role).toBe('owner');
    const exp = getExpiryMs(res.accessToken)!;
    expect(exp).toBeGreaterThan(Date.now());
    // exp is ~ACCESS_TTL_SECONDS in the future
    expect(Math.round((exp - Date.now()) / 1000)).toBeLessThanOrEqual(ACCESS_TTL_SECONDS);
    expect(document.cookie).toContain('sf_refresh=');
  });

  it('rejects invalid credentials', async () => {
    await expect(authService.login({ email: 'owner@x.com', password: 'fail' })).rejects.toMatchObject({ code: 'AUTH_INVALID' });
  });

  it('silent refresh restores the session and rotates the token', async () => {
    const first = await authService.login({ email: 'admin@x.com', password: 'ok' });
    const refreshed = await authService.refresh();
    expect(refreshed.user.role).toBe('platform_admin');
    expect(refreshed.accessToken).not.toBe(first.accessToken); // rotated (unique jti)
  });

  it('refresh fails after logout clears the cookie', async () => {
    await authService.login({ email: 'cashier@x.com', password: 'ok' });
    await authService.logout();
    await expect(authService.refresh()).rejects.toMatchObject({ code: 'NO_SESSION' });
  });

  it('never persists the access token to localStorage', async () => {
    const res = await authService.login({ email: 'owner@x.com', password: 'ok' });
    useSession.getState().setSession(res.user, res.accessToken);
    expect(useSession.getState().accessToken).toBe(res.accessToken); // in memory
    expect(JSON.stringify(localStorage)).not.toContain(res.accessToken); // not in storage
  });
});
