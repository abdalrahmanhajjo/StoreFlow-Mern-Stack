import mongoose, { Schema, Document } from "mongoose";

export type PaymentMethod = "cash" | "card" | "mobile_payment";
export type SaleStatus = "completed" | "voided" | "refunded";

export interface ISaleItem {
    productId: mongoose.Types.ObjectId;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface ISale extends Document {
    invoiceNumber: string;
    customerId?: mongoose.Types.ObjectId;
    cashierName?: string;
    items: ISaleItem[];
    subtotal: number;
    discount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    changeAmount: number;
    loyaltyPointsEarned: number;
    status: SaleStatus;
    notes?: string;
    isActive: boolean;
}

const saleItemSchema = new Schema<ISaleItem>(
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

        quantity: {
            type: Number,
            required: true,
            min: [1, "Quantity must be at least 1"],
        },

        unitPrice: {
            type: Number,
            required: true,
            min: [0, "Unit price cannot be negative"],
        },

        subtotal: {
            type: Number,
            required: true,
            min: [0, "Subtotal cannot be negative"],
        },
    },
    {
        _id: false,
    }
);

const saleSchema = new Schema<ISale>(
    {
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
        },

        cashierName: {
            type: String,
            trim: true,
            default: "Cashier",
        },

        items: {
            type: [saleItemSchema],
            required: true,
            validate: {
                validator: function (items: ISaleItem[]) {
                    return items.length > 0;
                },
                message: "Sale must contain at least one item",
            },
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        discount: {
            type: Number,
            default: 0,
            min: 0,
        },

        taxRate: {
            type: Number,
            default: 0,
            min: 0,
        },

        taxAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        total: {
            type: Number,
            required: true,
            min: 0,
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "card", "mobile_payment"],
            required: true,
        },

        paidAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        changeAmount: {
            type: Number,
            default: 0,
            min: 0,
        },


        loyaltyPointsEarned: {
            type: Number,
            default: 0,
            min: 0,
        },



        status: {
            type: String,
            enum: ["completed", "voided", "refunded"],
            default: "completed",
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

const Sale = mongoose.model<ISale>("Sale", saleSchema);

export default Sale;