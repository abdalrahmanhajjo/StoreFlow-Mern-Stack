import { api } from '@/lib/axios';
import type { Role, SessionUser } from '@/store/session';
import type { BusinessType } from '@/lib/contracts/types';
import { BUSINESS_TYPES } from '@/lib/contracts/types';
import { MOCK_PROFILES } from '@/mocks/profiles';
import type { LoginInput, RegisterInput } from './schemas';

export interface AuthResult {
  accessToken: string;
  user: SessionUser;
}

export interface ApprovalStatus {
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  /** Progress through the review pipeline: 0=submitted, 1=identity, 2=business, 3=activated, 4=approved */
  step: number;
}

/** Real API whenever a base URL is configured; otherwise the built-in demo
 * mocks keep the app fully usable without a backend. Unit tests always run
 * on the mocks, whatever .env says. */
const USE_MOCK = !import.meta.env.VITE_API_BASE_URL || import.meta.env.MODE === 'test';

/** Register form labels → backend businessType enum. */
const BUSINESS_TYPE_TO_API: Record<string, string> = {
  'Grocery / Supermarket': 'grocery',
  Restaurant: 'restaurant',
  Pharmacy: 'pharmacy',
  'Retail shop': 'retail',
};

/** Backend businessType enum → the store template the frontend renders. */
const API_BUSINESS_TYPE_TO_TEMPLATE: Record<string, BusinessType> = {
  grocery: 'supermarket',
  restaurant: 'restaurant',
  pharmacy: 'pharmacy',
  retail: 'boutique',
};

interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  storeId: string | null;
  businessType: string | null;
}

function sessionUserFromApi(u: ApiUser): SessionUser {
  return {
    id: String(u.id),
    name: u.name,
    email: u.email,
    role: u.role,
    storeId: u.storeId ? String(u.storeId) : null,
    businessType: u.businessType
      ? (API_BUSINESS_TYPE_TO_TEMPLATE[u.businessType] ?? 'supermarket')
      : null,
  };
}

/** True only for a well-formed user object from the API. Guards against a
 * misconfigured API base URL returning an HTML page (or any non-JSON) instead
 * of a user — which would otherwise crash on `user.id`. */
function isValidApiUser(u: unknown): u is ApiUser {
  return Boolean(u) && typeof u === 'object' && 'id' in (u as object) && 'role' in (u as object);
}

const BAD_RESPONSE = {
  code: 'SERVER',
  message: 'Unexpected response from the server. Check that the app is pointed at the API.',
};

const REFRESH_COOKIE = 'sf_refresh';
function writeMockRefresh(email: string) {
  document.cookie = `${REFRESH_COOKIE}=${encodeURIComponent(email)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}
function readMockRefresh(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${REFRESH_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function clearMockRefresh() {
  document.cookie = `${REFRESH_COOKIE}=; path=/; max-age=0`;
}

// In-memory store for registrations awaiting admin approval.
// In production this lives on the backend; here we simulate it.
// `step` tracks pipeline progress: 0=submitted → 1=identity verification → 2=business validation → 3=activated → 4=fully approved.
const pendingApprovals = new Map<string, { name: string; businessType: string; step: number }>();

function roleFromEmail(email: string): Role {
  const local = email.split('@')[0].toLowerCase();
  if (local.startsWith('admin')) return 'platform_admin';
  if (local.startsWith('manager')) return 'manager';
  if (local.startsWith('cashier')) return 'cashier';
  return 'owner';
}

function businessTypeFromEmail(email: string): BusinessType {
  const label = email.split('@')[1]?.split('.')[0]?.toLowerCase();
  return (BUSINESS_TYPES as readonly string[]).includes(label ?? '')
    ? (label as BusinessType)
    : 'supermarket';
}

function userFor(email: string, name?: string): SessionUser {
  const role = roleFromEmail(email);
  const businessType = businessTypeFromEmail(email);
  const profile = MOCK_PROFILES[businessType];
  return {
    id: 'u_' + role,
    name: name ?? (role === 'platform_admin' ? 'Platform Admin' : 'Amara Reyes'),
    email,
    role,
    storeId: role === 'platform_admin' ? null : profile.id,
    businessType: role === 'platform_admin' ? null : businessType,
  };
}

export const ACCESS_TTL_SECONDS = 15 * 60;

function base64Url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function mintAccessToken(user: SessionUser): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64Url({
    sub: user.id,
    role: user.role,
    storeId: user.storeId,
    iat: now,
    exp: now + ACCESS_TTL_SECONDS,
    jti: Math.random().toString(36).slice(2),
  });
  return `${header}.${payload}.mocksig`;
}

const delay = <T>(v: T, ms = 350): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));

export const authService = {
  async login(input: LoginInput): Promise<AuthResult> {
    if (USE_MOCK) {
      if (input.password === 'fail') {
        return Promise.reject({ code: 'AUTH_INVALID', message: 'Invalid email or password' });
      }

      const pending = pendingApprovals.get(input.email.toLowerCase());

      // Demo logins that didn't go through registration → auto-approve
      if (!pending) {
        writeMockRefresh(input.email);
        const user = userFor(input.email);
        return delay({ accessToken: mintAccessToken(user), user });
      }

      if (pending.step < 4) {
        return Promise.reject({
          code: 'PENDING_APPROVAL',
          message: 'Your account is still under review. We\'ll notify you once approved.',
        });
      }

      writeMockRefresh(input.email);
      const user = userFor(input.email, pending.name);
      return delay({ accessToken: mintAccessToken(user), user });
    }

    const { data } = await api.post('/auth/login', {
      email: input.email,
      password: input.password,
    });
    if (!data?.accessToken || !isValidApiUser(data.user)) {
      return Promise.reject(BAD_RESPONSE);
    }
    return { accessToken: data.accessToken, user: sessionUserFromApi(data.user) };
  },

  async register(input: RegisterInput): Promise<void> {
    if (USE_MOCK) {
      pendingApprovals.set(input.email.toLowerCase(), {
        name: input.ownerName,
        businessType: input.businessType,
        step: 0,
      });
      return delay(undefined);
    }

    await api.post('/auth/register', {
      storeName: input.storeName,
      address: input.businessAddress,
      businessType: BUSINESS_TYPE_TO_API[input.businessType] ?? 'retail',
      currency: input.currency,
      taxRegistrationId: input.businessTaxId || undefined,
      ownerName: input.ownerName,
      email: input.email,
      password: input.password,
      phone: {
        countryCode: input.ownerPhoneCode,
        number: input.ownerPhone.replace(/\D/g, ''),
      },
      idVerification: {
        type: input.ownerIdType,
        number: input.ownerIdNumber,
      },
    });
  },

  /** Confirms the 6-digit email code. Demo mode accepts any code. */
  async verifyEmailCode(email: string, code: string): Promise<void> {
    if (USE_MOCK) {
      return delay(undefined, 500);
    }
    await api.post('/auth/verify-email-code', { email, code });
  },

  async resendVerificationCode(email: string): Promise<void> {
    if (USE_MOCK) {
      return delay(undefined, 300);
    }
    await api.post('/auth/resend-verification-code', { email });
  },

  async checkApproval(email: string): Promise<ApprovalStatus> {
    if (USE_MOCK) {
      const key = email.toLowerCase();
      const pending = pendingApprovals.get(key);
      if (!pending) return delay({ status: 'approved', name: '', step: 4 });

      // Advance one pipeline step per check (simulates admin processing over time)
      if (pending.step < 4) {
        pending.step++;
      }

      return delay({
        status: pending.step >= 4 ? 'approved' : 'pending',
        name: pending.name,
        step: pending.step,
      }, 600);
    }

    const { data } = await api.get('/auth/approval-status', { params: { email } });
    return data as ApprovalStatus;
  },

  async refresh(): Promise<AuthResult> {
    if (USE_MOCK) {
      const email = readMockRefresh();
      if (!email) return Promise.reject({ code: 'NO_SESSION', message: 'No active session' });
      const user = userFor(email);
      return delay({ accessToken: mintAccessToken(user), user }, 200);
    }

    // The refresh endpoint only rotates tokens; the session user comes from
    // /me using the fresh token (the interceptor hasn't stored it yet).
    const { data } = await api.post('/auth/refresh');
    if (!data?.accessToken) return Promise.reject(BAD_RESPONSE);
    const me = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!isValidApiUser(me.data)) return Promise.reject(BAD_RESPONSE);
    return { accessToken: data.accessToken, user: sessionUserFromApi(me.data) };
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      clearMockRefresh();
      return delay(undefined, 100);
    }
    // Best-effort: the server revokes the refresh token and clears the cookie,
    // but a network failure must never block signing out locally.
    await api.post('/auth/logout').catch(() => undefined);
  },

  async requestReset(email: string): Promise<void> {
    if (USE_MOCK) {
      return delay(undefined);
    }
    await api.post('/auth/forgot-password', { email });
  },

  /** Checks the emailed 6-digit reset code. Demo mode accepts any code. */
  async verifyResetCode(email: string, code: string): Promise<void> {
    if (USE_MOCK) {
      return delay(undefined, 400);
    }
    await api.post('/auth/verify-reset-code', { email, code });
  },

  /** Completes the reset with the emailed code. */
  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    if (USE_MOCK) {
      return delay(undefined);
    }
    await api.post('/auth/reset-password', { email, code, newPassword });
  },

  /** Employee invite: read who/where the invite is for (accept page header). */
  async getInviteInfo(token: string): Promise<{ name: string; email: string; role: string; storeName: string | null }> {
    if (USE_MOCK) {
      return delay({ name: 'Jordan Cole', email: 'jordan@store.com', role: 'cashier', storeName: 'Demo Store' });
    }
    const { data } = await api.get('/auth/invite-info', { params: { token } });
    return data;
  },

  /** Employee invite: set password + activate the account. */
  async acceptInvite(token: string, newPassword: string, name?: string): Promise<void> {
    if (USE_MOCK) {
      return delay(undefined);
    }
    await api.post('/auth/accept-invite', { token, newPassword, name });
  },
};
