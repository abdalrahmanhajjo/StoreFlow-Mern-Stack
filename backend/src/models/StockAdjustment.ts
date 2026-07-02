import mongoose, { Schema, Document } from "mongoose";

export type AdjustmentType = "increase" | "decrease" | "set";

export interface IStockAdjustment extends Document {
    productId: mongoose.Types.ObjectId;
    productName: string;
    sku: string;
    adjustmentType: AdjustmentType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reason: string;
    adjustedByName?: string;
    notes?: string;
    isActive: boolean;
}

const stockAdjustmentSchema = new Schema<IStockAdjustment>(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "Product is required"],
        },

        productName: {
            type: String,
            required: true,
            trim: true,
        },

        sku: {
            type: String,
            required: true,
            trim: true,
        },

        adjustmentType: {
            type: String,
            enum: ["increase", "decrease", "set"],
            required: [true, "Adjustment type is required"],
        },

        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [0, "Quantity cannot be negative"],
        },

        previousQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        newQuantity: {
            type: Number,
            required: true,
            min: 0,
        },

        reason: {
            type: String,
            required: [true, "Reason is required"],
            trim: true,
        },

        adjustedByName: {
            type: String,
            trim: true,
            default: "Bakr",
        },

        notes: {
            type: String,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const StockAdjustment = mongoose.model<IStockAdjustment>(
    "StockAdjustment",
    stockAdjustmentSchema
);

export default StockAdjustment;