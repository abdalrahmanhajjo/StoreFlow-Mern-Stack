import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const phoneRegex = /^[0-9+\-\s()]{6,20}$/;
const storeNameRegex = /^[A-Za-z0-9\u0600-\u06FF\s&.'-]+$/;
const currencyRegex = /^[A-Z]{3}$/;
const invoicePrefixRegex = /^[A-Z0-9-]{2,10}$/;

export const storeSettingIdParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Store setting ID is required",
            })
            .regex(objectIdRegex, "Invalid store setting ID"),
    }),
});

export const createStoreSettingSchema = z.object({
    body: z.object({
        storeName: z
            .string({
                error: "Store name is required",
            })
            .trim()
            .min(2, "Store name must be at least 2 characters")
            .max(100, "Store name cannot exceed 100 characters")
            .regex(
                storeNameRegex,
                "Store name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            ),

        address: z
            .string()
            .trim()
            .max(250, "Address cannot exceed 250 characters")
            .optional(),

        phone: z
            .string()
            .trim()
            .regex(
                phoneRegex,
                "Phone number must be valid and contain only numbers, +, -, spaces, or parentheses"
            )
            .optional(),

        email: z
            .string()
            .trim()
            .email("Email must be a valid email address")
            .toLowerCase()
            .optional(),

        currency: z
            .string()
            .trim()
            .toUpperCase()
            .regex(currencyRegex, "Currency must be a valid 3-letter code like USD")
            .optional(),

        taxRate: z
            .number()
            .min(0, "Tax rate cannot be negative")
            .max(100, "Tax rate cannot exceed 100")
            .optional(),

        logoUrl: z
            .string()
            .trim()
            .url("Logo URL must be a valid URL")
            .optional(),

        invoicePrefix: z
            .string()
            .trim()
            .toUpperCase()
            .regex(
                invoicePrefixRegex,
                "Invoice prefix must be 2-10 characters and contain only uppercase letters, numbers, or hyphen"
            )
            .optional(),

        receiptFooter: z
            .string()
            .trim()
            .max(250, "Receipt footer cannot exceed 250 characters")
            .optional(),

        lowStockThreshold: z
            .number()
            .int("Low stock threshold must be a whole number")
            .min(0, "Low stock threshold cannot be negative")
            .optional(),

        timezone: z
            .string()
            .trim()
            .min(3, "Timezone must be valid")
            .max(50, "Timezone cannot exceed 50 characters")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const updateStoreSettingSchema = z.object({
    body: z.object({
        storeName: z
            .string()
            .trim()
            .min(2, "Store name must be at least 2 characters")
            .max(100, "Store name cannot exceed 100 characters")
            .regex(
                storeNameRegex,
                "Store name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            )
            .optional(),

        address: z
            .string()
            .trim()
            .max(250, "Address cannot exceed 250 characters")
            .optional(),

        phone: z
            .string()
            .trim()
            .regex(
                phoneRegex,
                "Phone number must be valid and contain only numbers, +, -, spaces, or parentheses"
            )
            .optional(),

        email: z
            .string()
            .trim()
            .email("Email must be a valid email address")
            .toLowerCase()
            .optional(),

        currency: z
            .string()
            .trim()
            .toUpperCase()
            .regex(currencyRegex, "Currency must be a valid 3-letter code like USD")
            .optional(),

        taxRate: z
            .number()
            .min(0, "Tax rate cannot be negative")
            .max(100, "Tax rate cannot exceed 100")
            .optional(),

        logoUrl: z
            .string()
            .trim()
            .url("Logo URL must be a valid URL")
            .optional(),

        invoicePrefix: z
            .string()
            .trim()
            .toUpperCase()
            .regex(
                invoicePrefixRegex,
                "Invoice prefix must be 2-10 characters and contain only uppercase letters, numbers, or hyphen"
            )
            .optional(),

        receiptFooter: z
            .string()
            .trim()
            .max(250, "Receipt footer cannot exceed 250 characters")
            .optional(),

        lowStockThreshold: z
            .number()
            .int("Low stock threshold must be a whole number")
            .min(0, "Low stock threshold cannot be negative")
            .optional(),

        timezone: z
            .string()
            .trim()
            .min(3, "Timezone must be valid")
            .max(50, "Timezone cannot exceed 50 characters")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});