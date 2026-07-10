import { z } from "zod";

const categoryNameRegex = /^[A-Za-z0-9\s&-]+$/;

export const createCategorySchema = z.object({
    body: z.object({
        name: z
            .string({
                error: "Category name is required",
            })
            .trim()
            .min(2, "Category name must be at least 2 characters")
            .max(50, "Category name cannot exceed 50 characters")
            .regex(
                categoryNameRegex,
                "Category name can only contain letters, numbers, spaces, &, and -"
            ),

        description: z
            .string()
            .trim()
            .max(250, "Description cannot exceed 250 characters")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});

export const updateCategorySchema = z.object({
    body: z.object({
        name: z
            .string()
            .trim()
            .min(2, "Category name must be at least 2 characters")
            .max(50, "Category name cannot exceed 50 characters")
            .regex(
                categoryNameRegex,
                "Category name can only contain letters, numbers, spaces, &, and -"
            )
            .optional(),

        description: z
            .string()
            .trim()
            .max(250, "Description cannot exceed 250 characters")
            .optional(),

        isActive: z.boolean().optional(),
    }),
});