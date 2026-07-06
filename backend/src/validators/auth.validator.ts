import { z } from 'zod';

export const registerSchema = z.object({
  storeName: z.string().min(2).max(120),
  currency: z.string().length(3).default('USD'),
  ownerName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(72),
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
