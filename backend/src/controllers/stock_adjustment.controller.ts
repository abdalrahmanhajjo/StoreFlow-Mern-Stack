import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";
import StockAdjustment from "../models/stock_adjustment.model";
import { tenantFilter } from "../utils/tenant.utils";
import { logMutation } from "../services/audit.service";

// GET all stock adjustments
export const getStockAdjustments = async (req: Request, res: Response) => {
    try {
        const adjustments = await StockAdjustment.find({ ...tenantFilter(req), isActive: true })
            .populate("productId", "name sku quantity price")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: adjustments.length,
            data: adjustments,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get stock adjustments",
            error: error.message,
        });
    }
};

// GET stock adjustment by ID
export const getStockAdjustmentById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid stock adjustment ID",
            });
            return;
        }

        const adjustment = await StockAdjustment.findOne({ ...tenantFilter(req),
            _id: id,
            isActive: true,
        }).populate("productId", "name sku quantity price");

        if (!adjustment) {
            res.status(404).json({
                success: false,
                message: "Stock adjustment not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: adjustment,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get stock adjustment",
            error: error.message,
        });
    }
};

// GET stock adjustments for one product
export const getProductStockAdjustments = async (
    req: Request,
    res: Response
) => {
    try {
        const productId = req.params.productId as string;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
            return;
        }

        const product = await Product.findOne({ ...tenantFilter(req),
            _id: productId,
            isActive: true,
        });

        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        const adjustments = await StockAdjustment.find({ ...tenantFilter(req),
            productId,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            product: {
                _id: product._id,
                name: product.name,
                sku: product.sku,
                currentQuantity: product.quantity,
            },
            count: adjustments.length,
            data: adjustments,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get product stock adjustments",
            error: error.message,
        });
    }
};

// CREATE stock adjustment
export const createStockAdjustment = async (req: Request, res: Response) => {
    try {
        const {
            productId,
            adjustmentType,
            quantity,
            reason,
            adjustedByName,
            notes,
        } = req.body;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
            return;
        }

        if (!["increase", "decrease", "set"].includes(adjustmentType)) {
            res.status(400).json({
                success: false,
                message: "Adjustment type must be increase, decrease, or set",
            });
            return;
        }

        const adjustmentQuantity = Number(quantity);

        if (
            quantity === undefined ||
            Number.isNaN(adjustmentQuantity) ||
            adjustmentQuantity < 0
        ) {
            res.status(400).json({
                success: false,
                message: "Quantity is required and cannot be negative",
            });
            return;
        }

        if (!reason) {
            res.status(400).json({
                success: false,
                message: "Reason is required",
            });
            return;
        }

        const product = await Product.findOne({ ...tenantFilter(req),
            _id: productId,
            isActive: true,
        });

        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        const previousQuantity = product.quantity;
        let newQuantity = previousQuantity;

        if (adjustmentType === "increase") {
            newQuantity = previousQuantity + adjustmentQuantity;
        }

        if (adjustmentType === "decrease") {
            if (adjustmentQuantity > previousQuantity) {
                res.status(400).json({
                    success: false,
                    message: `Cannot decrease by ${adjustmentQuantity}. Available stock is only ${previousQuantity}`,
                });
                return;
            }

            newQuantity = previousQuantity - adjustmentQuantity;
        }

        if (adjustmentType === "set") {
            newQuantity = adjustmentQuantity;
        }

        product.quantity = newQuantity;
        await product.save();

        const adjustment = await StockAdjustment.create({ storeId: req.storeId!, 
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            adjustmentType,
            quantity: adjustmentQuantity,
            previousQuantity,
            newQuantity,
            reason,
            adjustedByName,
            notes,
        });

        const fullAdjustment = await StockAdjustment.findById(adjustment._id).populate(
            "productId",
            "name sku quantity price"
        );

        logMutation(req, 'CREATE', 'stock_adjustment', adjustment._id.toString(), {
            description: `Created stock adjustment: ${adjustmentType} by ${adjustmentQuantity} for ${product.name}`,
            metadata: { productId, adjustmentType, quantity: adjustmentQuantity, reason: reason || undefined },
        });

        res.status(201).json({
            success: true,
            message: "Stock adjustment created successfully",
            data: {
                adjustment: fullAdjustment,
                product,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create stock adjustment",
            error: error.message,
        });
    }
};

// DELETE stock adjustment record only
export const deleteStockAdjustment = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid stock adjustment ID",
            });
            return;
        }

        const adjustment = await StockAdjustment.findOneAndUpdate(
            { ...tenantFilter(req),
                _id: id,
                isActive: true,
            },
            {
                isActive: false,
            },
            {
                new: true,
            }
        );

        if (!adjustment) {
            res.status(404).json({
                success: false,
                message: "Stock adjustment not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Stock adjustment record deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete stock adjustment",
            error: error.message,
        });
    }
};