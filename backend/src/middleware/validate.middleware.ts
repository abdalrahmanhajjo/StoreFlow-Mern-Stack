import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validate =
    (schema: z.ZodObject<any> | z.ZodType<any>) =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            if (!result.success) {
                const errors = result.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                }));

                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors,
                });

                return;
            }

            if (result.data.body) req.body = result.data.body;
            if (result.data.query) req.query = result.data.query;
            if (result.data.params) req.params = result.data.params;

            next();
        };