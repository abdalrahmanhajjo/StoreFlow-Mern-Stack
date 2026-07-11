import { api } from '@/lib/api';
import type { SessionUser } from '@/store/session';
import type { LoginInput, RegisterInput } from './schemas';

export interface AuthResult {
  accessToken: string;
  user: SessionUser;
}

export interface RegisterResult {
  userId: string;
  storeId: string;
  email: string;
  isEmailVerified: boolean;
}

export const authService = {
  // POST /auth/login
  async login(input: LoginInput): Promise<AuthResult> {
    return api.post<AuthResult>(
      '/auth/login',
      { email: input.email, password: input.password },
      { skipAuth: true }
    );
  },

  // POST /auth/register — matches auth.validator.ts registerSchema exactly.
  // NOTE: businessPhone / businessPhoneCode are collected in step 0 but have
  // nowhere to go — registerSchema has no field for the business's own phone,
  // only the owner's (`phone`). Dropped here; add a field to the backend
  // schema + store.model.ts if you want to keep collecting it.
  async register(input: RegisterInput): Promise<RegisterResult> {
    const payload = {
      storeName: input.storeName,
      address: input.businessAddress,
      businessType: input.businessType,
      currency: input.currency,
      taxRegistrationId: input.businessTaxId || undefined,
      ownerName: input.ownerName,
      email: input.email,
      password: input.password,
      phone: {
        countryCode: input.ownerPhoneCode,
        number: input.ownerPhone,
      },
      idVerification: {
        type: input.ownerIdType,
        number: input.ownerIdNumber,
      },
    };
    const res = await api.post<{ data: RegisterResult }>('/auth/register', payload, { skipAuth: true });
    return res.data;
  },

  // POST /auth/verify-email-code
  async verifyEmailCode(email: string, code: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/verify-email-code', { email, code }, { skipAuth: true });
  },

  // POST /auth/resend-verification-code
  async resendVerificationCode(email: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/resend-verification-code', { email }, { skipAuth: true });
  },

  // POST /auth/refresh — cookie-based, only returns a new accessToken.
  // refresh.ts follows this up with me() to (re)fetch the user profile.
  async refresh(): Promise<{ accessToken: string }> {
    return api.post<{ accessToken: string }>('/auth/refresh', undefined, { skipAuth: true });
  },

  // GET /auth/me — token passed explicitly since this runs right after
  // refresh(), before the session store has the new token yet.
  async me(accessToken: string): Promise<SessionUser> {
    return api.get<SessionUser>('/auth/me', { token: accessToken });
  },

  // POST /auth/logout
  async logout(): Promise<void> {
    await api.post<void>('/auth/logout', undefined, { skipAuth: true });
  },

  // POST /auth/forgot-password
  async forgotPassword(email: string): Promise<void> {
    await api.post<void>('/auth/forgot-password', { email }, { skipAuth: true });
  },

  // POST /auth/reset-password — token comes from the emailed link's ?token= param.
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post<void>('/auth/reset-password', { token, newPassword }, { skipAuth: true });
  },
};