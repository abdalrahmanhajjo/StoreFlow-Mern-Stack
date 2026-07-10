import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const loyaltyLedgerIdParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Loyalty ledger ID is required",
            })
            .regex(objectIdRegex, "Invalid loyalty ledger ID"),
    }),
});

export const loyaltyCustomerIdParamSchema = z.object({
    params: z.object({
        customerId: z
            .string({
                error: "Customer ID is required",
            })
            .regex(objectIdRegex, "Invalid customer ID"),
    }),
});

export const loyaltyLedgerQuerySchema = z.object({
    query: z.object({
        customerId: z
            .string()
            .regex(objectIdRegex, "Invalid customer ID")
            .optional(),

        type: z
            .enum(["earn", "redeem", "adjust"], {
                error: "Loyalty type must be earn, redeem, or adjust",
            })
            .optional(),
    }),
});

export const earnPointsSchema = z.object({
    body: z.object({
        customerId: z
            .string({
                error: "Customer ID is required",
            })
            .regex(objectIdRegex, "Invalid customer ID"),

        amountSpent: z
            .number()
            .min(0, "Amount spent cannot be negative")
            .optional(),

        points: z
            .number({
                error: "Points are required",
            })
            .int("Points must be a whole number")
            .min(1, "Points must be greater than 0"),

        description: z
            .string()
            .trim()
            .max(250, "Description cannot exceed 250 characters")
            .optional(),

        reference: z
            .string()
            .trim()
            .max(100, "Reference cannot exceed 100 characters")
            .optional(),
    }),
});

export const redeemPointsSchema = z.object({
    body: z.object({
        customerId: z
            .string({
                error: "Customer ID is required",
            })
            .regex(objectIdRegex, "Invalid customer ID"),

        points: z
            .number({
                error: "Points are required",
            })
            .int("Points must be a whole number")
            .min(1, "Points must be greater than 0"),

        description: z
            .string()
            .trim()
            .max(250, "Description cannot exceed 250 characters")
            .optional(),

        reference: z
            .string()
            .trim()
            .max(100, "Reference cannot exceed 100 characters")
            .optional(),
    }),
});

export const adjustPointsSchema = z.object({
    body: z.object({
        customerId: z
            .string({
                error: "Customer ID is required",
            })
            .regex(objectIdRegex, "Invalid customer ID"),

        points: z
            .number({
                error: "Points are required",
            })
            .int("Points must be a whole number")
            .refine((value) => value !== 0, {
                message: "Points adjustment cannot be 0",
            }),

        description: z
            .string()
            .trim()
            .max(250, "Description cannot exceed 250 characters")
            .optional(),

        reference: z
            .string()
            .trim()
            .max(100, "Reference cannot exceed 100 characters")
            .optional(),
    }),
});