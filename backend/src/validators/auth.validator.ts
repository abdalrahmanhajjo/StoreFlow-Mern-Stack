import { z } from 'zod';

export const registerSchema = z.object({
  // Store fields
  storeName: z.string().min(2).max(120),
  address: z.string().min(5).max(200),
  businessType: z.enum(['grocery', 'restaurant', 'pharmacy', 'retail']),
  currency: z.string().length(3).default('USD'),
  taxRegistrationId: z.string().optional(),

  // Owner fields
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),

  // Contact & Verification
  phone: z.object({
    countryCode: z.string().min(1).max(5),
    number: z.string().min(7).max(15),
  }),
  idVerification: z.object({
    type: z.enum(['national_id', 'passport', 'drivers_license']),
    number: z.string().min(5).max(50),
  }),

  // Plan selection (optional — defaults to free plan)
  planPublicId: z.string().optional(),
  billingInterval: z.enum(['monthly', 'yearly']).optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  // Owners must type DELETE — checked in the controller so staff (who only
  // remove their own login) are not asked for it.
  confirmText: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Reset code must be 6 digits');

export const verifyResetCodeSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  code: resetCode,
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  code: resetCode,
  newPassword: z.string().min(8).max(72),
});


export const verifyEmailCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email must be valid')
    .toLowerCase(),

  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

export const resendVerificationCodeSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email must be valid')
    .toLowerCase(),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(120).optional(),
});
