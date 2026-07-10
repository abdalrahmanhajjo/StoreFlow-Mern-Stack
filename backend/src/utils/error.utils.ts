export class AppError extends Error {
    public statusCode: number;
    public success: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.success = false;

        // Maintain proper stack trace capture for Node environments
        Error.captureStackTrace(this, this.constructor);
    }
}