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

const USE_MOCK = true;

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
    throw new Error('not implemented');
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
    throw new Error('not implemented');
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
    throw new Error('not implemented');
  },

  async refresh(): Promise<AuthResult> {
    if (USE_MOCK) {
      const email = readMockRefresh();
      if (!email) return Promise.reject({ code: 'NO_SESSION', message: 'No active session' });
      const user = userFor(email);
      return delay({ accessToken: mintAccessToken(user), user }, 200);
    }
    throw new Error('not implemented');
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      clearMockRefresh();
      return delay(undefined, 100);
    }
  },

  async requestReset(_email: string): Promise<void> {
    return delay(undefined);
  },
};
