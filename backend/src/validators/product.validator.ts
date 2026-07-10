import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const productNameRegex = /^[A-Za-z0-9\s&\-_.()]+$/;
const skuRegex = /^[A-Za-z0-9\-_]+$/;
const barcodeRegex = /^[A-Za-z0-9\-]+$/;

export const createProductSchema = z.object({
    body: z.object({
        name: z
            .string({
                error: "Product name is required",
            })
            .trim()
            .min(2, "Product name must be at least 2 characters")
            .max(100, "Product name cannot exceed 100 characters")
            .regex(
                productNameRegex,
                "Product name can only contain letters, numbers, spaces, &, -, _, ., and ()"
            ),

        sku: z
            .string({
                error: "SKU is required",
            })
            .trim()
            .min(2, "SKU must be at least 2 characters")
            .max(50, "SKU cannot exceed 50 characters")
            .regex(
                skuRegex,
                "SKU can only contain letters, numbers, hyphen, and underscore"
            ),

        barcode: z
            .string()
            .trim()
            .max(50, "Barcode cannot exceed 50 characters")
            .regex(
                barcodeRegex,
                "Barcode can only contain letters, numbers, and hyphen"
            )
            .optional(),

        description: z
            .string()
            .trim()
            .max(500, "Description cannot exceed 500 characters")
            .optional(),

        price: z
            .number({
                error: "Price is required",
            })
            .min(0, "Price cannot be negative"),

        cost: z
            .number({
                error: "Cost is required",
            })
            .min(0, "Cost cannot be negative"),

        quantity: z
            .number()
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative")
            .optional(),

        reorderThreshold: z
            .number()
            .int("Reorder threshold must be a whole number")
            .min(0, "Reorder threshold cannot be negative")
            .optional(),

        imageUrl: z
            .string()
            .trim()
            .url("Image URL must be a valid URL")
            .optional(),

        categoryId: z
            .string({
                error: "Category is required",
            })
            .regex(objectIdRegex, "Invalid category ID"),

        isActive: z.boolean().optional(),
    }),
});

export const updateProductSchema = z.object({
    body: z.object({
        name: z
            .string()
            .trim()
            .min(2, "Product name must be at least 2 characters")
            .max(100, "Product name cannot exceed 100 characters")
            .regex(
                productNameRegex,
                "Product name can only contain letters, numbers, spaces, &, -, _, ., and ()"
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

        barcode: z
            .string()
            .trim()
            .max(50, "Barcode cannot exceed 50 characters")
            .regex(
                barcodeRegex,
                "Barcode can only contain letters, numbers, and hyphen"
            )
            .optional(),

        description: z
            .string()
            .trim()
            .max(500, "Description cannot exceed 500 characters")
            .optional(),

        price: z
            .number()
            .min(0, "Price cannot be negative")
            .optional(),

        cost: z
            .number()
            .min(0, "Cost cannot be negative")
            .optional(),

        quantity: z
            .number()
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative")
            .optional(),

        reorderThreshold: z
            .number()
            .int("Reorder threshold must be a whole number")
            .min(0, "Reorder threshold cannot be negative")
            .optional(),

        imageUrl: z
            .string()
            .trim()
            .url("Image URL must be a valid URL")
            .optional(),

        categoryId: z
            .string()
            .regex(objectIdRegex, "Invalid category ID")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const updateProductStockSchema = z.object({
    body: z.object({
        quantity: z
            .number({
                error: "Quantity is required",
            })
            .int("Quantity must be a whole number")
            .min(0, "Quantity cannot be negative"),
    }),
});