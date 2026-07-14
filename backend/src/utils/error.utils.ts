export class AppError extends Error {
    public statusCode: number;
    public success: boolean;
    /** Optional structured payload (e.g. downgrade limit conflicts) for the response body. */
    public details?: unknown;

    constructor(message: string, statusCode: number, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.details = details;

        // Maintain proper stack trace capture for Node environments
        Error.captureStackTrace(this, this.constructor);
    }
}