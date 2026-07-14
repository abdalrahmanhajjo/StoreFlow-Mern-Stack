import { z } from 'zod';

export const COUNTRY_CODES = [
  { code: '+1', label: '+1  US / CA' },
  { code: '+44', label: '+44  UK' },
  { code: '+961', label: '+961  Lebanon' },
  { code: '+20', label: '+20  Egypt' },
  { code: '+33', label: '+33  France' },
  { code: '+39', label: '+39  Italy' },
  { code: '+49', label: '+49  Germany' },
  { code: '+971', label: '+971  UAE' },
  { code: '+966', label: '+966  Saudi Arabia' },
  { code: '+974', label: '+974  Qatar' },
  { code: '+965', label: '+965  Kuwait' },
  { code: '+962', label: '+962  Jordan' },
  { code: '+212', label: '+212  Morocco' },
  { code: '+213', label: '+213  Algeria' },
  { code: '+216', label: '+216  Tunisia' },
  { code: '+31', label: '+31  Netherlands' },
  { code: '+34', label: '+34  Spain' },
  { code: '+351', label: '+351  Portugal' },
  { code: '+90', label: '+90  Turkey' },
  { code: '+91', label: '+91  India' },
] as const;

// SF-101 / SF-102 validation
export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email').max(254),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

const PHONE_RE = /^[\d\s\-()+]{4,20}$/;
const PHONE_ERR = 'Enter a valid phone number (e.g. 555 123 4567)';

export const registerSchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(60, 'Store name is too long'),
  businessType: z.string().min(1, 'Select a business type'),
  currency: z.string().min(1, 'Select a currency'),
  businessPhoneCode: z.string().min(1, 'Select a country code'),
  businessPhone: z
    .string()
    .min(4, PHONE_ERR)
    .regex(PHONE_RE, PHONE_ERR),
  businessAddress: z.string().min(5, 'Enter your full street address (at least 5 characters)').max(200, 'Address is too long'),
  businessTaxId: z
    .string()
    .max(30, 'Tax ID is too long')
    .optional()
    .or(z.literal('')),
  ownerName: z.string().min(2, 'Enter the owner full name (at least 2 characters)').max(100, 'Name is too long'),
  ownerPhoneCode: z.string().min(1, 'Select a country code'),
  ownerPhone: z
    .string()
    .min(4, PHONE_ERR)
    .regex(PHONE_RE, PHONE_ERR),
  ownerIdType: z.enum(['national_id', 'passport', 'drivers_license'], 'Select a valid ID type'),
  ownerIdNumber: z.string().min(3, 'ID number must be at least 3 characters').max(40, 'ID number is too long'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address (e.g. you@store.com)'),
  password: z
    .string()
    .min(8, 'At least 8 characters required')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/\d/, 'Must include a number')
    .regex(/[^a-zA-Z0-9]/, 'Must include a special character (!@#$ etc.)'),
  otp: z.string().length(6, 'Enter the full 6-digit code').regex(/^\d{6}$/, 'Code must be exactly 6 digits').optional().or(z.literal('')),
  // Plan selection (optional — carried from pricing page)
  planPublicId: z.string().optional(),
  billingInterval: z.enum(['monthly', 'yearly']).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
