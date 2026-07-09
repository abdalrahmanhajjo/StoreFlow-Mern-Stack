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
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(72),
});
