import mongoose, { Schema, Document } from "mongoose";

export interface IStoreSetting extends Document {
    storeName: string;
    address?: string;
    phone?: string;
    email?: string;
    currency: string;
    taxRate: number;
    logoUrl?: string;
    invoicePrefix: string;
    receiptFooter?: string;
    lowStockThreshold: number;
    timezone: string;
    isActive: boolean;
}

const storeSettingSchema = new Schema<IStoreSetting>(
    {
        storeName: {
            type: String,
            required: [true, "Store name is required"],
            trim: true,
        },

        address: {
            type: String,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        currency: {
            type: String,
            required: true,
            trim: true,
            default: "USD",
        },

        taxRate: {
            type: Number,
            default: 0,
            min: [0, "Tax rate cannot be negative"],
        },

        logoUrl: {
            type: String,
            trim: true,
        },

        invoicePrefix: {
            type: String,
            trim: true,
            default: "INV",
        },

        receiptFooter: {
            type: String,
            trim: true,
            default: "Thank you for shopping with us!",
        },

        lowStockThreshold: {
            type: Number,
            default: 5,
            min: [0, "Low stock threshold cannot be negative"],
        },

        timezone: {
            type: String,
            trim: true,
            default: "Asia/Beirut",
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

const StoreSetting = mongoose.model<IStoreSetting>(
    "StoreSetting",
    storeSettingSchema
);

export default StoreSetting;