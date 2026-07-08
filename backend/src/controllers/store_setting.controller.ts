import { Request, Response } from "express";
import StoreSetting from "../models/store_setting.model";

// GET store settings
export const getStoreSetting = async (req: Request, res: Response) => {
    try {
        let setting = await StoreSetting.findOne({ isActive: true });

        if (!setting) {
            setting = await StoreSetting.create({
                storeName: "StoreFlow Store",
                currency: "USD",
                taxRate: 0,
                invoicePrefix: "INV",
                receiptFooter: "Thank you for shopping with us!",
                lowStockThreshold: 5,
                timezone: "Asia/Beirut",
            });
        }

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
        const existingSetting = await StoreSetting.findOne({ isActive: true });

        if (existingSetting) {
            res.status(400).json({
                success: false,
                message:
                    "Store settings already exist. Use update instead of creating a new one.",
            });
            return;
        }

        const setting = await StoreSetting.create(req.body);

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
        let setting = await StoreSetting.findOne({ isActive: true });

        if (!setting) {
            setting = await StoreSetting.create({
                storeName: "StoreFlow Store",
                currency: "USD",
                taxRate: 0,
                invoicePrefix: "INV",
                receiptFooter: "Thank you for shopping with us!",
                lowStockThreshold: 5,
                timezone: "Asia/Beirut",
            });
        }

        const updatedSetting = await StoreSetting.findByIdAndUpdate(
            setting._id,
            req.body,
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
        let setting = await StoreSetting.findOne({ isActive: true });

        if (!setting) {
            setting = await StoreSetting.create({
                storeName: "StoreFlow Store",
                currency: "USD",
                taxRate: 0,
                invoicePrefix: "INV",
                receiptFooter: "Thank you for shopping with us!",
                lowStockThreshold: 5,
                timezone: "Asia/Beirut",
            });
        } else {
            setting.storeName = "StoreFlow Store";
            setting.address = "";
            setting.phone = "";
            setting.email = "";
            setting.currency = "USD";
            setting.taxRate = 0;
            setting.logoUrl = "";
            setting.invoicePrefix = "INV";
            setting.receiptFooter = "Thank you for shopping with us!";
            setting.lowStockThreshold = 5;
            setting.timezone = "Asia/Beirut";

            await setting.save();
        }

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