import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const cashierNameRegex = /^[A-Za-z\u0600-\u06FF\s.'-]+$/;

export const createSaleSchema = z.object({
    body: z.object({
        customerId: z
            .string()
            .regex(objectIdRegex, "Invalid customer ID")
            .optional(),

        cashierName: z
            .string()
            .trim()
            .min(2, "Cashier name must be at least 2 characters")
            .max(100, "Cashier name cannot exceed 100 characters")
            .regex(
                cashierNameRegex,
                "Cashier name can only contain letters, spaces, dots, apostrophes, and hyphens"
            )
            .optional(),

        items: z
            .array(
                z.object({
                    productId: z
                        .string({
                            error: "Product ID is required",
                        })
                        .regex(objectIdRegex, "Invalid product ID"),

                    quantity: z
                        .number({
                            error: "Quantity is required",
                        })
                        .int("Quantity must be a whole number")
                        .min(1, "Quantity must be at least 1"),
                })
            )
            .min(1, "Sale must contain at least one item"),

        discount: z
            .number()
            .min(0, "Discount cannot be negative")
            .optional(),

        taxRate: z
            .number()
            .min(0, "Tax rate cannot be negative")
            .optional(),

        paymentMethod: z.enum(["cash", "card", "mobile_payment"], {
            error: "Payment method must be cash, card, or mobile_payment",
        }),

        paidAmount: z
            .number()
            .min(0, "Paid amount cannot be negative")
            .optional(),

        notes: z
            .string()
            .trim()
            .max(500, "Notes cannot exceed 500 characters")
            .optional(),
    }),
});

export const saleIdParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Sale ID is required",
            })
            .regex(objectIdRegex, "Invalid sale ID"),
    }),
});

export const invoiceNumberParamSchema = z.object({
    params: z.object({
        invoiceNumber: z
            .string({
                error: "Invoice number is required",
            })
            .trim()
            .min(5, "Invoice number is too short")
            .max(100, "Invoice number is too long"),
    }),
});