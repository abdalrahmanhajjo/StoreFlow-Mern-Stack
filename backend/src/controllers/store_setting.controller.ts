import { Request, Response } from "express";
import StoreSetting from "../models/store_setting.model";
import { requireStoreId } from "../utils/tenant.utils";

const DEFAULTS = {
    storeName: "StoreFlow Store",
    currency: "USD",
    taxRate: 0,
    invoicePrefix: "INV",
    receiptFooter: "Thank you for shopping with us!",
    lowStockThreshold: 5,
    timezone: "Asia/Beirut",
};

/** Settings are a per-store singleton, created on first touch. */
async function getOrCreateSetting(storeId: string) {
    const existing = await StoreSetting.findOne({ storeId, isActive: true });
    if (existing) return existing;
    return StoreSetting.create({ storeId, ...DEFAULTS });
}

// GET store settings
export const getStoreSetting = async (req: Request, res: Response) => {
    try {
        const storeId = requireStoreId(req, res);
        if (!storeId) return;

        const setting = await getOrCreateSetting(storeId);

        res.status(200).json({
            success: true,
            data: setting,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get store settings",
            error: error.message,
        });
    }
};

// CREATE store settings
export const createStoreSetting = async (req: Request, res: Response) => {
    try {
        const storeId = requireStoreId(req, res);
        if (!storeId) return;

        const existingSetting = await StoreSetting.findOne({ storeId, isActive: true });

        if (existingSetting) {
            res.status(400).json({
                success: false,
                message:
                    "Store settings already exist. Use update instead of creating a new one.",
            });
            return;
        }

        // storeId last so the body can never write another store's settings.
        const setting = await StoreSetting.create({ ...req.body, storeId });

        res.status(201).json({
            success: true,
            message: "Store settings created successfully",
            data: setting,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create store settings",
            error: error.message,
        });
    }
};

// UPDATE store settings
export const updateStoreSetting = async (req: Request, res: Response) => {
    try {
        const storeId = requireStoreId(req, res);
        if (!storeId) return;

        const setting = await getOrCreateSetting(storeId);

        const { storeId: _ignored, ...patch } = req.body ?? {};
        void _ignored;
        const updatedSetting = await StoreSetting.findByIdAndUpdate(
            setting._id,
            patch,
            {
                new: true,
                runValidators: true,
            }
        );

        res.status(200).json({
            success: true,
            message: "Store settings updated successfully",
            data: updatedSetting,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to update store settings",
            error: error.message,
        });
    }
};

// RESET store settings to default
export const resetStoreSetting = async (req: Request, res: Response) => {
    try {
        const storeId = requireStoreId(req, res);
        if (!storeId) return;

        const setting = await getOrCreateSetting(storeId);

        Object.assign(setting, DEFAULTS, {
            address: "",
            phone: "",
            email: "",
            logoUrl: "",
        });
        await setting.save();

        res.status(200).json({
            success: true,
            message: "Store settings reset successfully",
            data: setting,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to reset store settings",
            error: error.message,
        });
    }
};
