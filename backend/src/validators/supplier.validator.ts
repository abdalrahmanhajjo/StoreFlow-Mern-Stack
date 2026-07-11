import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const supplierNameRegex = /^[A-Za-z0-9\u0600-\u06FF\s&.'-]+$/;
const phoneRegex = /^[0-9+\-\s()]{6,20}$/;

export const supplierIdParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Supplier ID is required",
            })
            .regex(objectIdRegex, "Invalid supplier ID"),
    }),
});

export const supplierProductParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Supplier ID is required",
            })
            .regex(objectIdRegex, "Invalid supplier ID"),

        productId: z
            .string({
                error: "Product ID is required",
            })
            .regex(objectIdRegex, "Invalid product ID"),
    }),
});

export const createSupplierSchema = z.object({
    body: z.object({
        // storeId is injected from the authenticated tenant scope by the
        // controller — clients neither send nor can override it.
        name: z
            .string({
                error: "Supplier name is required",
            })
            .trim()
            .min(2, "Supplier name must be at least 2 characters")
            .max(100, "Supplier name cannot exceed 100 characters")
            .regex(
                supplierNameRegex,
                "Supplier name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            ),

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

        address: z
            .string()
            .trim()
            .max(250, "Address cannot exceed 250 characters")
            .optional(),

        suppliedProducts: z
            .array(z.string().regex(objectIdRegex, "Invalid product ID"))
            .optional(),

        notes: z
            .string()
            .trim()
            .max(500, "Notes cannot exceed 500 characters")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const updateSupplierSchema = z.object({
    body: z.object({
        storeId: z
            .string()
            .regex(objectIdRegex, "Invalid store ID")
            .optional(),

        name: z
            .string()
            .trim()
            .min(2, "Supplier name must be at least 2 characters")
            .max(100, "Supplier name cannot exceed 100 characters")
            .regex(
                supplierNameRegex,
                "Supplier name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            )
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

        address: z
            .string()
            .trim()
            .max(250, "Address cannot exceed 250 characters")
            .optional(),

        suppliedProducts: z
            .array(z.string().regex(objectIdRegex, "Invalid product ID"))
            .optional(),

        notes: z
            .string()
            .trim()
            .max(500, "Notes cannot exceed 500 characters")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const addProductToSupplierSchema = z.object({
    body: z.object({
        productId: z
            .string({
                error: "Product ID is required",
            })
            .regex(objectIdRegex, "Invalid product ID"),
    }),
});