import { z } from "zod";

export const dashboardQuerySchema = z.object({
    query: z.object({
        recentLimit: z
            .string()
            .regex(/^\d+$/, "recentLimit must be a number")
            .refine(
                (value) => Number(value) >= 1,
                "recentLimit must be at least 1"
            )
            .refine(
                (value) => Number(value) <= 20,
                "recentLimit cannot exceed 20"
            )
            .optional(),
    }),
});