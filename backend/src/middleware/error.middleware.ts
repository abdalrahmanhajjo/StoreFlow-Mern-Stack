import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

const errorHandler = (
    err: any, // Adjusted type to 'any' to cleanly parse custom properties, Mongo errors, and Zod errors
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);

    // 1. Establish defaults
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";
    let errors: any = undefined;

    // 2. Catch Zod errors if they are forwarded to next()
    if (err instanceof ZodError) {
        statusCode = 400;
        message = "Validation error";
        errors = err.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
    }

    // 3. Catch MongoDB unique constraint violations (e.g., duplicate SKUs)
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyValue)[0];
        message = `A record with this ${field} already exists.`;
    }

    // 4. Send down a strictly normalized JSON structure
    res.status(statusCode).json({
        success: false, // Added to keep success tracking unified across your whole API layout
        message,
        ...(errors && { errors }), // Only appends the 'errors' field if validation actually failed
    });
};

export default errorHandler;