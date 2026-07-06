import { Request, Response, NextFunction } from "express";

export type UserRole = "admin" | "manager" | "cashier";

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            res.status(401).json({
                success: false,
                message: "Not authenticated. Please login first.",
            });
            return;
        }

        if (!allowedRoles.includes(user.role)) {
            res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission to perform this action.",
            });
            return;
        }

        next();
    };
};