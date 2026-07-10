import { z } from "zod";

const phoneRegex = /^[0-9+\-\s()]{6,20}$/;
const customerNameRegex = /^[A-Za-z\u0600-\u06FF\s.'-]+$/;

export const createCustomerSchema = z.object({
    body: z.object({
        name: z
            .string({
                error: "Customer name is required",
            })
            .trim()
            .min(2, "Customer name must be at least 2 characters")
            .max(100, "Customer name cannot exceed 100 characters")
            .regex(
                customerNameRegex,
                "Customer name can only contain letters, spaces, dots, apostrophes, and hyphens"
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

        totalSpent: z
            .number()
            .min(0, "Total spent cannot be negative")
            .optional(),

        loyaltyPoints: z
            .number()
            .int("Loyalty points must be a whole number")
            .min(0, "Loyalty points cannot be negative")
            .optional(),

        lifetimePointsEarned: z
            .number()
            .int("Lifetime points earned must be a whole number")
            .min(0, "Lifetime points earned cannot be negative")
            .optional(),

        loyaltyTier: z
            .enum(["Bronze", "Silver", "Gold", "Platinum"])
            .optional(),

        purchaseHistory: z
            .array(
                z.object({
                    productName: z
                        .string({
                            error: "Product name is required in purchase history",
                        })
                        .trim()
                        .min(2, "Product name must be at least 2 characters")
                        .max(100, "Product name cannot exceed 100 characters"),

                    amount: z
                        .number({
                            error: "Amount is required in purchase history",
                        })
                        .min(0, "Purchase amount cannot be negative"),

                    purchaseDate: z
                        .string()
                        .datetime("Purchase date must be a valid date")
                        .optional(),

                    note: z
                        .string()
                        .trim()
                        .max(250, "Purchase note cannot exceed 250 characters")
                        .optional(),
                })
            )
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const updateCustomerSchema = z.object({
    body: z.object({
        name: z
            .string()
            .trim()
            .min(2, "Customer name must be at least 2 characters")
            .max(100, "Customer name cannot exceed 100 characters")
            .regex(
                customerNameRegex,
                "Customer name can only contain letters, spaces, dots, apostrophes, and hyphens"
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

        totalSpent: z
            .number()
            .min(0, "Total spent cannot be negative")
            .optional(),

        loyaltyPoints: z
            .number()
            .int("Loyalty points must be a whole number")
            .min(0, "Loyalty points cannot be negative")
            .optional(),

        lifetimePointsEarned: z
            .number()
            .int("Lifetime points earned must be a whole number")
            .min(0, "Lifetime points earned cannot be negative")
            .optional(),

        loyaltyTier: z
            .enum(["Bronze", "Silver", "Gold", "Platinum"])
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const addPurchaseHistorySchema = z.object({
    body: z.object({
        productName: z
            .string({
                error: "Product name is required",
            })
            .trim()
            .min(2, "Product name must be at least 2 characters")
            .max(100, "Product name cannot exceed 100 characters"),

        amount: z
            .number({
                error: "Amount is required",
            })
            .min(0, "Purchase amount cannot be negative"),

        purchaseDate: z
            .string()
            .datetime("Purchase date must be a valid date")
            .optional(),

        note: z
            .string()
            .trim()
            .max(250, "Purchase note cannot exceed 250 characters")
            .optional(),
    }),
});