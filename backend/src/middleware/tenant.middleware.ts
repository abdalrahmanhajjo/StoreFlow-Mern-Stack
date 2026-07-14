import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/user.model";

declare global {
    namespace Express {
        interface Request {
            storeId?: string | null;
        }
    }
}

/**
 * Resolve the store an owner belongs to when the JWT/user doc is missing the
 * link (accounts that predate the storeId claim, or whose store was created
 * after the token was signed). Persists the link so future logins carry it.
 */
async function resolveOwnerStoreId(userId: string): Promise<string | null> {
    const { Store } = await import("../models/store.model");
    const { User } = await import("../models/user.model");
    // Legacy store docs used `ownerId` instead of `owner` — check both.
    const store = await Store.findOne({
        $or: [{ owner: userId }, { ownerId: userId } as Record<string, unknown>],
    }).select("_id");
    if (!store) return null;
    await User.updateOne({ _id: userId }, { $set: { storeId: store._id } });
    return store._id.toString();
}

export const tenantScope = async (req: Request, res: Response, next: NextFunction) => {
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

    if (req.user.storeId) {
        req.storeId = req.user.storeId;
        return next();
    }

    // Self-heal: an owner token without a storeId claim may still own a store.
    if (req.user.role === ("owner" as UserRole)) {
        const storeId = await resolveOwnerStoreId(req.user.sub);
        if (storeId) {
            req.storeId = storeId;
            return next();
        }
    }

    // Enforce store scoping for standard tenant roles (Store Owner, Manager, Cashier)
    res.status(403).json({
        success: false,
        message: "Access denied: Account is not assigned to a valid store tenant.",
    });
};

/**
 * Like tenantScope, but never rejects: account-level surfaces (e.g. billing)
 * must work for owners whose store doesn't exist yet — the handlers treat
 * req.storeId as optional.
 */
export const tenantScopeOptional = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: "Authentication required for tenant scoping",
        });
        return;
    }

    if (req.user.role === ("platform_admin" as UserRole)) {
        req.storeId = null;
        return next();
    }

    if (req.user.storeId) {
        req.storeId = req.user.storeId;
        return next();
    }

    req.storeId = req.user.role === ("owner" as UserRole)
        ? await resolveOwnerStoreId(req.user.sub)
        : null;
    next();
};
