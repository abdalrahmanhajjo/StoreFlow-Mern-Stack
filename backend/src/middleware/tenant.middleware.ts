import { ObjectId } from "mongoose";
import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/user.model";

declare global {
    namespace Express {
        interface Request {
            storeId?: string | ObjectId | null;
        }
    }
}

export const tenantScope = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required for tenant scoping",
        });
        return;
    }

    // Platform Admin Bypass: Allow them to pass through without being locked to a single store
    if (req.user.role === ("platform_admin" as UserRole)) {
        req.storeId = null;
        return next();
    }

    // Enforce store scoping for standard tenant roles (Store Owner, Manager, Cashier)
    if (!req.user.storeId) {
        res.status(403).json({
            success: false,
            message: "Access denied: Account is not assigned to a valid store tenant.",
        });
        return;
    }

    req.storeId = req.user.storeId;
    next();
};