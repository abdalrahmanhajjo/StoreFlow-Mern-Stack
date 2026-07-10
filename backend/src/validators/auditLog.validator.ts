import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const nameRegex = /^[A-Za-z0-9\u0600-\u06FF\s&.'-]+$/;

const auditActions = [
    "CREATE_SALE",
    "VOID_SALE",
    "STOCK_DECREMENT",
    "STOCK_RESTORE",
    "LOYALTY_EARNED",
    "LOYALTY_REVERSED",
    "CREATE_PRODUCT",
    "UPDATE_PRODUCT",
    "DELETE_PRODUCT",
    "STOCK_ADJUSTMENT",
    "RECEIVE_PURCHASE_ORDER",
    "PO_STOCK_INCREASE",
] as const;

export const auditLogIdParamSchema = z.object({
    params: z.object({
        id: z
            .string({
                error: "Audit log ID is required",
            })
            .regex(objectIdRegex, "Invalid audit log ID"),
    }),
});

export const auditLogQuerySchema = z.object({
    query: z.object({
        action: z
            .enum(auditActions, {
                error: "Invalid audit action",
            })
            .optional(),

        entity: z
            .string()
            .trim()
            .min(2, "Entity must be at least 2 characters")
            .max(100, "Entity cannot exceed 100 characters")
            .optional(),

        entityId: z
            .string()
            .regex(objectIdRegex, "Invalid entity ID")
            .optional(),

        performedByName: z
            .string()
            .trim()
            .min(2, "Performed by name must be at least 2 characters")
            .max(100, "Performed by name cannot exceed 100 characters")
            .optional(),

        search: z
            .string()
            .trim()
            .max(100, "Search cannot exceed 100 characters")
            .optional(),
    }),
});

export const createAuditLogSchema = z.object({
    body: z.object({
        action: z.enum(auditActions, {
            error: "Invalid audit action",
        }),

        entity: z
            .string({
                error: "Entity is required",
            })
            .trim()
            .min(2, "Entity must be at least 2 characters")
            .max(100, "Entity cannot exceed 100 characters"),

        entityId: z
            .string()
            .regex(objectIdRegex, "Invalid entity ID")
            .optional(),

        description: z
            .string({
                error: "Description is required",
            })
            .trim()
            .min(3, "Description must be at least 3 characters")
            .max(500, "Description cannot exceed 500 characters"),

        performedByName: z
            .string()
            .trim()
            .min(2, "Performed by name must be at least 2 characters")
            .max(100, "Performed by name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Performed by name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            )
            .optional(),

        metadata: z.any().optional(),

        isActive: z.boolean().optional(),
    }),
});

export const updateAuditLogSchema = z.object({
    body: z.object({
        action: z
            .enum(auditActions, {
                error: "Invalid audit action",
            })
            .optional(),

        entity: z
            .string()
            .trim()
            .min(2, "Entity must be at least 2 characters")
            .max(100, "Entity cannot exceed 100 characters")
            .optional(),

        entityId: z
            .string()
            .regex(objectIdRegex, "Invalid entity ID")
            .optional(),

        description: z
            .string()
            .trim()
            .min(3, "Description must be at least 3 characters")
            .max(500, "Description cannot exceed 500 characters")
            .optional(),

        performedByName: z
            .string()
            .trim()
            .min(2, "Performed by name must be at least 2 characters")
            .max(100, "Performed by name cannot exceed 100 characters")
            .regex(
                nameRegex,
                "Performed by name can only contain letters, numbers, spaces, &, dots, apostrophes, and hyphens"
            )
            .optional(),

        metadata: z.any().optional(),

        isActive: z.boolean().optional(),
    }),
});

export const auditEntityParamSchema = z.object({
    params: z.object({
        entity: z
            .string({
                error: "Entity is required",
            })
            .trim()
            .min(2, "Entity must be at least 2 characters")
            .max(100, "Entity cannot exceed 100 characters"),

        entityId: z
            .string({
                error: "Entity ID is required",
            })
            .regex(objectIdRegex, "Invalid entity ID"),
    }),
});