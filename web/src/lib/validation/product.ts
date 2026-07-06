import { z } from 'zod';
import { safeImageUrl } from '@/lib/security/url';

// Centralised, typed product validation shared by the create/edit form and any
// future API payload shaping. Keep client rules aligned with the server's — the
// server remains the source of truth.
export const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
  sku: z.string().trim().min(1, 'SKU is required').max(64, 'SKU is too long'),
  category: z.string().trim().min(1, 'Category is required'),
  price: z.number({ message: 'Price must be a number' }).min(0, 'Price cannot be negative').max(1_000_000),
  cost: z.number({ message: 'Cost must be a number' }).min(0, 'Cost cannot be negative').max(1_000_000),
  stock: z.number({ message: 'Stock must be a number' }).int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  reorderPoint: z.number({ message: 'Reorder point must be a number' }).int().min(0, 'Reorder point cannot be negative'),
  emoji: z.string().min(1).max(8).default('📦'),
  // Only http(s) URLs are accepted; anything else (javascript:, data:, …) is
  // coerced to '' so it can never be reflected into an <img src>.
  image: z
    .string()
    .max(2048)
    .optional()
    .transform((v) => safeImageUrl(v ?? '')),
});

export type ProductFormValues = z.infer<typeof productSchema>;
