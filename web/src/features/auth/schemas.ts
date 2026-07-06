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

export const registerSchema = z.object({
  storeName: z.string().min(2, 'Store name is too short').max(60),
  businessType: z.string().min(1),
  currency: z.string().min(1),
  businessPhoneCode: z.string().min(1, 'Select a code'),
  businessPhone: z
    .string()
    .regex(/^[\d\s\-()]{4,15}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  businessAddress: z.string().min(5, 'Address is too short').max(200),
  businessTaxId: z
    .string()
    .min(3, 'Tax ID is too short')
    .max(30)
    .optional()
    .or(z.literal('')),
  ownerName: z.string().min(2, 'Name is required'),
  ownerPhoneCode: z.string().min(1, 'Select a code'),
  ownerPhone: z.string().regex(/^[\d\s\-()]{4,15}$/, 'Enter a valid phone number'),
  ownerIdType: z.enum(['national_id', 'passport', 'drivers_license'], 'Select an ID type'),
  ownerIdNumber: z.string().min(3, 'ID number is too short').max(40),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/\d/, 'Include a number')
    .regex(/[^a-zA-Z0-9]/, 'Include a special character'),
  otp: z.string().length(6, 'Enter the complete code').regex(/^\d{6}$/, 'Code must be 6 digits').optional().or(z.literal('')),
});
export type RegisterInput = z.infer<typeof registerSchema>;
