import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const nameRegex = /^[A-Za-z0-9\u0600-\u06FF\s&.'-]+$/;
const skuRegex = /^[A-Za-z0-9\-_]+$/;

export const stockAdjustmentIdParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Stock adjustment ID is required",
            })
            .regex(objectIdRegex, "Invalid stock adjustment ID"),
    }),
});

export const createStockAdjustmentSchema = z.object({
    body: z.object({
        productId: z
            .string({
                error: "Product ID is required",
            })
            .regex(objectIdRegex, "Invalid product ID"),

        adjustmentType: z.enum(["increase", "decrease", "set"], {
            error: "Adjustment type must be increase, decrease, or set",
        }),

        quantity: z
            .number({
                error: "Quantity is required",
            })
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative"),

        reason: z
            .string({
                error: "Reason is required",
            })
            .trim()
            .min(3, "Reason must be at least 3 characters")
            .max(250, "Reason cannot exceed 250 characters"),

        adjustedByName: z
            .string()
            .trim()
            .min(2, "Adjusted by name must be at least 2 characters")
            .max(100, "Adjusted by name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Adjusted by name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            )
            .optional(),

        notes: z
            .string()
            .trim()
            .max(500, "Notes cannot exceed 500 characters")
            .optional(),
    }),
});

export const updateStockAdjustmentSchema = z.object({
    body: z.object({
        productName: z
            .string()
            .trim()
            .min(2, "Product name must be at least 2 characters")
            .max(100, "Product name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Product name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            )
            .optional(),

        sku: z
            .string()
            .trim()
            .min(2, "SKU must be at least 2 characters")
            .max(50, "SKU cannot exceed 50 characters")
            .regex(
                skuRegex,
                "SKU can only contain letters, numbers, hyphen, and underscore"
            )
            .optional(),

        adjustmentType: z
            .enum(["increase", "decrease", "set"], {
                error: "Adjustment type must be increase, decrease, or set",
            })
            .optional(),

        quantity: z
            .number()
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative")
            .optional(),

        delta: z.number().optional(),

        previousQuantity: z
            .number()
            .int("Previous quantity must be a whole number")
            .min(0, "Previous quantity cannot be negative")
            .optional(),

        newQuantity: z
            .number()
            .int("New quantity must be a whole number")
            .min(0, "New quantity cannot be negative")
            .optional(),

        reason: z
            .string()
            .trim()
            .min(3, "Reason must be at least 3 characters")
            .max(250, "Reason cannot exceed 250 characters")
            .optional(),

        adjustedByName: z
            .string()
            .trim()
            .min(2, "Adjusted by name must be at least 2 characters")
            .max(100, "Adjusted by name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Adjusted by name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            )
            .optional(),

        notes: z
            .string()
            .trim()
            .max(500, "Notes cannot exceed 500 characters")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const stockAdjustmentQuerySchema = z.object({
    query: z.object({
        productId: z
            .string()
            .regex(objectIdRegex, "Invalid product ID")
            .optional(),

        adjustmentType: z
            .enum(["increase", "decrease", "set"], {
                error: "Adjustment type must be increase, decrease, or set",
            })
            .optional(),

        search: z.string().trim().max(100, "Search cannot exceed 100 characters").optional(),
    }),
});