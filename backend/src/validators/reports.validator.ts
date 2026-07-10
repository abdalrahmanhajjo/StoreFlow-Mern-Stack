import { z } from "zod";

const isValidDate = (value: string) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
};

export const reportsSummaryQuerySchema = z.object({
    query: z
        .object({
            startDate: z
                .string()
                .refine(isValidDate, "startDate must be a valid date")
                .optional(),

            endDate: z
                .string()
                .refine(isValidDate, "endDate must be a valid date")
                .optional(),
        })
        .refine(
            (data) => {
                if (!data.startDate || !data.endDate) return true;
                return new Date(data.startDate) <= new Date(data.endDate);
            },
            {
                message: "startDate cannot be after endDate",
                path: ["startDate"],
            }
        ),
});

export const topProductsReportQuerySchema = z.object({
    query: z
        .object({
            startDate: z
                .string()
                .refine(isValidDate, "startDate must be a valid date")
                .optional(),

            endDate: z
                .string()
                .refine(isValidDate, "endDate must be a valid date")
                .optional(),

            sortBy: z.enum(["quantity", "revenue"]).optional(),

            limit: z
                .string()
                .regex(/^\d+$/, "Limit must be a number")
                .refine((value) => Number(value) >= 1, "Limit must be at least 1")
                .refine((value) => Number(value) <= 100, "Limit cannot exceed 100")
                .optional(),
        })
        .refine(
            (data) => {
                if (!data.startDate || !data.endDate) return true;
                return new Date(data.startDate) <= new Date(data.endDate);
            },
            {
                message: "startDate cannot be after endDate",
                path: ["startDate"],
            }
        ),
});

export const cashierPerformanceReportQuerySchema = z.object({
    query: z
        .object({
            startDate: z
                .string()
                .refine(isValidDate, "startDate must be a valid date")
                .optional(),

            endDate: z
                .string()
                .refine(isValidDate, "endDate must be a valid date")
                .optional(),
        })
        .refine(
            (data) => {
                if (!data.startDate || !data.endDate) return true;
                return new Date(data.startDate) <= new Date(data.endDate);
            },
            {
                message: "startDate cannot be after endDate",
                path: ["startDate"],
            }
        ),
});