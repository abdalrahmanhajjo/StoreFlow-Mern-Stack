import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Store } from "../models/store.model";
import { AppError } from "../utils/error.utils";
import { User } from "../models/user.model";
import { BillingAccount } from "../models/billingAccount.model";
import { Subscription } from "../models/subscription.model";
import { pickAllowed, stripOperators } from "../utils/security.utils";
import { logMutation } from "../services/audit.service";

const STORE_UPDATE_FIELDS = ['name', 'address', 'businessType', 'currency', 'taxRegistrationId', 'taxRate'] as const;

// Helper to construct dynamic queries depending on user role bypasses
const buildStoreFilter = (req: Request, baseFilter: any = {}) => {
    const filter = { ...baseFilter };
    // If the user isn't a platform_admin (meaning req.storeId is set and not null), restrict them strictly
    if (req.storeId) {
        filter._id = req.storeId;
    }
    return filter;
};

// 1. CREATE A NEW STORE (Strictly platform_admin)
export const createStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { storeName, address, businessType, currency, taxRate, taxRegistrationId, ownerId } = req.body;

        if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
            return next(new AppError("A valid ownerId is required to instantiate a store tenant.", 400));
        }

        if (!businessType || !['grocery', 'restaurant', 'pharmacy', 'retail'].includes(businessType)) {
            return next(new AppError("A valid businessType is required (grocery, restaurant, pharmacy, retail).", 400));
        }

        // 1. Verify the owner exists and holds the proper role
        const ownerUser = await User.findById(ownerId);
        if (!ownerUser) {
            return next(new AppError("The assigned owner user account does not exist.", 404));
        }

        if (ownerUser.role !== "owner") {
            return next(new AppError("Stores can only be assigned to users with the 'owner' role.", 400));
        }

        if (ownerUser.storeId) {
            return next(new AppError("This user is already linked to an existing store tenant.", 400));
        }

        // 2. Initialize trial subscription
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

        // 3. Instantiate the new store record
        const newStore = await Store.create({
            publicId: new mongoose.Types.ObjectId().toString(),
            name: storeName,
            slug: storeName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            address,
            businessType,
            currency: currency || 'USD',
            taxRate: taxRate || 0,
            taxRegistrationId: taxRegistrationId || undefined,
            owner: ownerId,
            status: "pending",
            isVerified: false,
        });

        try {
            // 4. Connect the store's ID back to the owner's profile (Two-way sync)
            ownerUser.storeId = newStore._id as any;
            await ownerUser.save();

            logMutation(req, 'CREATE', 'store', newStore._id.toString(), {
                description: `Created store: ${newStore.name}`,
                metadata: { businessType: newStore.businessType, storeName: newStore.name },
            });

            res.status(201).json({
                success: true,
                message: "Store created and linked to owner successfully",
                data: newStore,
            });
        } catch (saveError) {
            // Rollback strategy: Clean up the orphaned store if the user linking fails
            await Store.deleteOne({ _id: newStore._id });
            return next(saveError);
        }
    } catch (error) {
        next(error);
    }
};

// 2. GET STORES (platform_admin sees all; owner/manager sees only their own store)
export const getStores = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filter = buildStoreFilter(req);
        const stores = await Store.find(filter)
            .populate("owner", "name email role")
            .lean();

        // Two eras of store docs coexist: legacy ones used `ownerId` and
        // `storeName`. Resolve legacy owners in one query so every row
        // reaches the client with the same shape.
        const legacyOwnerIds = stores
            .filter((s: any) => !s.owner && s.ownerId)
            .map((s: any) => s.ownerId);
        const legacyOwners = legacyOwnerIds.length
            ? await User.find({ _id: { $in: legacyOwnerIds } }).select("name email role").lean()
            : [];
        const legacyOwnerById = new Map(legacyOwners.map((u) => [String(u._id), u]));

        // The store's real plan lives on its owner's billing subscription —
        // resolve them all in two queries (accounts, then live subscriptions).
        const ownerIds = stores
            .map((s: any) => s.owner?._id ?? s.ownerId)
            .filter(Boolean);
        const accounts = await BillingAccount.find({ owner: { $in: ownerIds } }).select("owner").lean();
        const accountByOwner = new Map(accounts.map((a) => [String(a.owner), String(a._id)]));
        const subs = accounts.length
            ? await Subscription.find({
                account: { $in: accounts.map((a) => a._id) },
                status: { $in: ["active", "trialing"] },
              })
                .sort({ currentPeriodStart: -1 })
                .populate("plan", "name code")
                .lean()
            : [];
        const planByAccount = new Map<string, unknown>();
        for (const s of subs) {
            const key = String(s.account);
            if (!planByAccount.has(key)) planByAccount.set(key, s.plan);
        }

        // Month-to-date revenue per store, in one aggregation.
        const { default: Sale } = await import("../models/sale.model");
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const mtdRows = await Sale.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            { $group: { _id: "$storeId", total: { $sum: "$total" } } },
        ]);
        const mtdByStore = new Map(mtdRows.map((r: any) => [String(r._id), r.total]));

        const data = stores.map((s: any) => {
            const owner = s.owner ?? legacyOwnerById.get(String(s.ownerId)) ?? null;
            const accountId = owner ? accountByOwner.get(String(owner._id)) : undefined;
            return {
                ...s,
                name: s.name ?? s.storeName ?? "—",
                owner,
                plan: (accountId ? planByAccount.get(accountId) : null) ?? null,
                salesMtd: mtdByStore.get(String(s._id)) ?? 0,
            };
        });

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        next(error);
    }
};

// 3. GET STORE BY ID
export const getStoreById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Store ID format", 400));
        }

        // Fixed baseline: Ensure req.storeId actually exists before checking string inequality
        if (req.storeId && req.storeId.toString() !== id) {
            return next(new AppError("Access denied: You are not authorized to view this store's data profile", 403));
        }

        const store = await Store.findById(id)
            .populate("owner", "name email role")
            .lean();

        if (!store) {
            return next(new AppError("Store profile not found", 404));
        }

        res.status(200).json({
            success: true,
            // Legacy docs used `storeName` — normalise so clients read `name`.
            data: { ...store, name: (store as any).name ?? (store as any).storeName ?? "—" },
        });
    } catch (error) {
        next(error);
    }
};

// 4. UPDATE STORE PROFILE (Owners can tweak tax rates, currency, name, etc.)
export const updateStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Store ID format", 400));
        }

        if (req.storeId && req.storeId.toString() !== id) {
            return next(new AppError("Access denied: You cannot edit parameters outside your tenant scope", 403));
        }

        // Clone the body to avoid mutating req.body directly
        const updateData = pickAllowed(stripOperators(req.body), STORE_UPDATE_FIELDS);

        // Safe Guardrail: Prevent regular Owners from manually changing store statuses or owners
        if (req.user?.role !== "platform_admin") {
            delete updateData.status;
            delete updateData.owner;
        }

        const updatedStore = await Store.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedStore) {
            return next(new AppError("Store not found", 404));
        }

        logMutation(req, 'UPDATE', 'store', id, {
            description: `Updated store: ${updatedStore.name}`,
            metadata: { updatedFields: Object.keys(updateData) },
        });

        res.status(200).json({
            success: true,
            message: "Store profile updated successfully",
            data: updatedStore,
        });
    } catch (error) {
        next(error);
    }
};

// 5. CHANGE STORE STATUS (Strictly platform_admin Only)
export const changeStoreStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Store ID format", 400));
        }

        if (!["pending", "active", "suspended"].includes(status)) {
            return next(new AppError("Invalid status value provided", 400));
        }

        const store = await Store.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!store) {
            return next(new AppError("Store profile not found", 404));
        }

        logMutation(req, 'UPDATE', 'store', id, {
            description: `Changed store status to ${status}`,
            metadata: { status },
        });

        res.status(200).json({
            success: true,
            message: `Store status has been marked as ${status} successfully`,
            data: store,
        });
    } catch (error) {
        next(error);
    }
};