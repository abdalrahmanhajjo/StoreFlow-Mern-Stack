import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validate =
    (schema: z.ZodObject<any> | z.ZodType<any>) =>
    (req: Request, res: Response, next: NextFunction) => {
        // By validating the whole request object, you can optionally target body, query, or params
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (!result.success) {
            // Forward the Zod error directly to your global errorHandler middleware
            return next(result.error);
        }

        // Assign sanitized, validated data back to express request spaces
        if (result.data.body) req.body = result.data.body;
        if (result.data.query) req.query = result.data.query;
        if (result.data.params) req.params = result.data.params;

        next();
    };