import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/user.model";
import { AppError } from "../utils/error.utils";

export const authorize =
    (...roles: UserRole[]) =>
    (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.user) {
            return next(new AppError("Authentication required", 401));
        }

        if (!roles.includes(req.user.role)) {
            return next(new AppError("Access denied", 403));
        }

        next();
    };