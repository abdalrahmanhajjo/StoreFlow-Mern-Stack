import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const nameRegex = /^[A-Za-z\u0600-\u06FF\s.'-]+$/;

export const purchaseOrderIdParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Purchase order ID is required",
            })
            .regex(objectIdRegex, "Invalid purchase order ID"),
    }),
});

export const supplierIdParamSchema = z.object({
    params: z.object({
        supplierId: z
            .string({
                error: "Supplier ID is required",
            })
            .regex(objectIdRegex, "Invalid supplier ID"),
    }),
});

export const createPurchaseOrderSchema = z.object({
    body: z.object({
        supplierId: z
            .string({
                error: "Supplier is required",
            })
            .regex(objectIdRegex, "Invalid supplier ID"),

        items: z
            .array(
                z.object({
                    productId: z
                        .string({
                            error: "Product ID is required",
                        })
                        .regex(objectIdRegex, "Invalid product ID"),

                    quantityOrdered: z
                        .number({
                            error: "Quantity ordered is required",
                        })
                        .int("Quantity ordered must be a whole number")
                        .min(1, "Quantity ordered must be at least 1"),

                    unitCost: z
                        .number({
                            error: "Unit cost is required",
                        })
                        .min(0, "Unit cost cannot be negative"),
                })
            )
            .min(1, "Purchase order must contain at least one item"),

        createdByName: z
            .string()
            .trim()
            .min(2, "Created by name must be at least 2 characters")
            .max(100, "Created by name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Created by name can only contain letters, spaces, dots, apostrophes, and hyphens"
            )
            .optional(),

        notes: z
            .string()
            .trim()
            .max(500, "Notes cannot exceed 500 characters")
            .optional(),
    }),
});

export const updatePurchaseOrderSchema = z.object({
    body: z.object({
        supplierId: z
            .string()
            .regex(objectIdRegex, "Invalid supplier ID")
            .optional(),

        items: z
            .array(
                z.object({
                    productId: z
                        .string({
                            error: "Product ID is required",
                        })
                        .regex(objectIdRegex, "Invalid product ID"),

                    quantityOrdered: z
                        .number({
                            error: "Quantity ordered is required",
                        })
                        .int("Quantity ordered must be a whole number")
                        .min(1, "Quantity ordered must be at least 1"),

                    unitCost: z
                        .number({
                            error: "Unit cost is required",
                        })
                        .min(0, "Unit cost cannot be negative"),
                })
            )
            .min(1, "Purchase order must contain at least one item")
            .optional(),

        status: z
            .enum(["pending", "ordered", "partially_received", "received", "cancelled"])
            .optional(),

        createdByName: z
            .string()
            .trim()
            .min(2, "Created by name must be at least 2 characters")
            .max(100, "Created by name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Created by name can only contain letters, spaces, dots, apostrophes, and hyphens"
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

export const receivePurchaseOrderSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Purchase order ID is required",
            })
            .regex(objectIdRegex, "Invalid purchase order ID"),
    }),

    body: z.object({
        receivedByName: z
            .string()
            .trim()
            .min(2, "Received by name must be at least 2 characters")
            .max(100, "Received by name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Received by name can only contain letters, spaces, dots, apostrophes, and hyphens"
            )
            .optional(),

        receivedItems: z
            .array(
                z.object({
                    productId: z
                        .string({
                            error: "Product ID is required",
                        })
                        .regex(objectIdRegex, "Invalid product ID"),

                    quantityReceived: z
                        .number({
                            error: "Quantity received is required",
                        })
                        .int("Quantity received must be a whole number")
                        .min(1, "Quantity received must be at least 1"),
                })
            )
            .min(1, "receivedItems must contain at least one item"),

        notes: z
            .string()
            .trim()
            .max(500, "Notes cannot exceed 500 characters")
            .optional(),
    }),
});

export const cancelPurchaseOrderSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Purchase order ID is required",
            })
            .regex(objectIdRegex, "Invalid purchase order ID"),
    }),

    body: z
        .object({
            cancelledByName: z
                .string()
                .trim()
                .min(2, "Cancelled by name must be at least 2 characters")
                .max(100, "Cancelled by name cannot exceed 100 characters")
                .regex(
                    nameRegex,
                    "Cancelled by name can only contain letters, spaces, dots, apostrophes, and hyphens"
                )
                .optional(),

            reason: z
                .string()
                .trim()
                .max(500, "Cancel reason cannot exceed 500 characters")
                .optional(),
        })
        .optional(),
});