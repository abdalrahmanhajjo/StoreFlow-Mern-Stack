import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";
import StockAdjustment from "../models/stock_adjustment.model";
import { escapeRegex, pickAllowed, safeRegex, stripOperators } from "../utils/security.utils";
import { tenantFilter } from "../utils/tenant.utils";
import { logMutation } from "../services/audit.service";

const ADJUST_ALLOWED_FIELDS = ['productId', 'delta', 'reason', 'note'] as const;

class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

// POST /api/inventory/adjust
export const adjustInventory = async (req: Request, res: Response) => {
    try {
        const { productId, delta, reason, adjustedByName, notes } = req.body;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            throw new AppError("Valid product ID is required", 400);
        }

        const numericDelta = Number(delta);

        if (!numericDelta || Number.isNaN(numericDelta) || numericDelta === 0) {
            throw new AppError("Delta is required and cannot be 0", 400);
        }

        if (!reason || reason.trim() === "") {
            throw new AppError("Reason is required for inventory adjustment", 400);
        }

        const productBeforeUpdate = await Product.findOne({ ...tenantFilter(req),
            _id: productId,
            isActive: true,
        });

        if (!productBeforeUpdate) {
            throw new AppError("Product not found", 404);
        }

        const previousQuantity = productBeforeUpdate.quantity;
        const newQuantity = previousQuantity + numericDelta;

        if (newQuantity < 0) {
            throw new AppError(
                `Stock cannot become negative. Current quantity is ${previousQuantity}.`,
                400
            );
        }

        const updatedProduct = await Product.findOneAndUpdate(
            { ...tenantFilter(req),
                _id: productId,
                isActive: true,
                quantity: {
                    $gte: numericDelta < 0 ? Math.abs(numericDelta) : 0,
                },
            },
            {
                $inc: {
                    quantity: numericDelta,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedProduct) {
            throw new AppError(
                "Inventory adjustment failed. Product may not have enough stock.",
                400
            );
        }

        const adjustmentType = numericDelta > 0 ? "increase" : "decrease";

        const adjustment = await StockAdjustment.create({ storeId: req.storeId!, 
            productId: updatedProduct._id,
            productName: updatedProduct.name,
            sku: updatedProduct.sku,
            adjustmentType,
            quantity: Math.abs(numericDelta),
            delta: numericDelta,
            previousQuantity,
            newQuantity: updatedProduct.quantity,
            reason,
            adjustedByName: adjustedByName || "Bakr",
            notes,
        });

        const fullAdjustment = await StockAdjustment.findById(adjustment._id)
            .populate("productId", "name sku price quantity reorderThreshold");

        logMutation(req, 'UPDATE', 'inventory', updatedProduct._id.toString(), {
            description: `Inventory adjusted by ${numericDelta} for ${updatedProduct.name}`,
            metadata: { delta: numericDelta, productId: updatedProduct._id.toString() },
        }).catch(() => {});

        res.status(201).json({
            success: true,
            message: "Inventory adjusted successfully",
            data: {
                adjustment: fullAdjustment,
                product: updatedProduct,
            },
        });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to adjust inventory",
        });
    }
};


// GET /api/inventory/low-stock
export const getLowStockInventory = async (req: Request, res: Response) => {
    try {
        const products = await Product.find({ ...tenantFilter(req),
            isActive: true,
            $expr: {
                $lte: ["$quantity", "$reorderThreshold"],
            },
        })
            .populate("categoryId", "name description")
            .sort({ quantity: 1 });

        res.status(200).json({
            success: true,
            count: products.length,
            message: "Low stock products retrieved successfully",
            data: products,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get low stock products",
            error: error.message,
        });
    }
};

// GET /api/inventory/history
export const getInventoryHistory = async (req: Request, res: Response) => {
    try {
        const productId = req.query.productId as string | undefined;
        const adjustmentType = req.query.adjustmentType as string | undefined;
        const search = req.query.search as string | undefined;

        const filter: any = {
            ...tenantFilter(req),
            isActive: true,
        };

        if (productId) {
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID",
                });
                return;
            }

            filter.productId = productId;
        }

        if (adjustmentType) {
            if (!["increase", "decrease", "set"].includes(adjustmentType)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid adjustment type. Use increase, decrease, or set.",
                });
                return;
            }

            filter.adjustmentType = adjustmentType;
        }

        if (search) {
            filter.$or = [
                safeRegex('productName', search),
                safeRegex('sku', search),
                safeRegex('reason', search),
                safeRegex('adjustedByName', search),
            ];
        }

        const history = await StockAdjustment.find(filter)
            .populate("productId", "name sku price quantity reorderThreshold")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: history.length,
            message: "Inventory adjustment history retrieved successfully",
            data: history,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get inventory history",
            error: error.message,
        });
    }
};