import { z } from 'zod';
import { safeImageUrl } from '@/lib/security/url';

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name is too long'),
  sku: z.string().trim().min(1, 'SKU is required').max(64, 'SKU is too long'),
  barcode: z.string().trim().max(64, 'Barcode is too long').optional().default(''),
  category: z.string().trim().min(1, 'Category is required'),
  price: z.number({ message: 'Price must be a number' }).min(0, 'Price cannot be negative').max(1_000_000),
  cost: z.number({ message: 'Cost must be a number' }).min(0, 'Cost cannot be negative').max(1_000_000),
  stock: z.number({ message: 'Stock must be a number' }).int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  reorderPoint: z.number({ message: 'Reorder point must be a number' }).int().min(0, 'Reorder point cannot be negative'),
  emoji: z.string().min(1).max(8).default('📦'),
  image: z.string().max(512_000, 'Image too large').optional().transform((v) => safeImageUrl(v ?? '')),
});

export type ProductFormValues = z.infer<typeof productSchema>;
