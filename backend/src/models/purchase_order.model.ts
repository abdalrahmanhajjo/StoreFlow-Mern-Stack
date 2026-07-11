import mongoose, { Schema, Document } from "mongoose";

export type PurchaseOrderStatus =
    | "pending"
    | "ordered"
    | "partially_received"
    | "received"
    | "cancelled";

export interface IPurchaseOrderItem {
    productId: mongoose.Types.ObjectId;
    productName: string;
    sku: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    subtotal: number;
}

export interface IPurchaseOrder extends Document {
    storeId: mongoose.Types.ObjectId;
    supplierId: mongoose.Types.ObjectId;
    supplierName: string;
    orderNumber: string;
    items: IPurchaseOrderItem[];
    status: PurchaseOrderStatus;
    totalCost: number;
    orderDate: Date;
    receivedDate?: Date;
    createdByName?: string;
    notes?: string;
    isActive: boolean;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
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

        quantityOrdered: {
            type: Number,
            required: true,
            min: [1, "Quantity ordered must be at least 1"],
        },

        quantityReceived: {
            type: Number,
            default: 0,
            min: [0, "Quantity received cannot be negative"],
        },

        unitCost: {
            type: Number,
            required: true,
            min: [0, "Unit cost cannot be negative"],
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

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: [true, "storeId is required"],
            index: true,
        },
        supplierId: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            required: [true, "Supplier is required"],
        },

        supplierName: {
            type: String,
            required: true,
            trim: true,
        },

        orderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        items: {
            type: [purchaseOrderItemSchema],
            required: true,
            validate: {
                validator: function (items: IPurchaseOrderItem[]) {
                    return items.length > 0;
                },
                message: "Purchase order must contain at least one item",
            },
        },

        status: {
            type: String,
            enum: [
                "pending",
                "ordered",
                "partially_received",
                "received",
                "cancelled",
            ],
            default: "pending",
        },

        totalCost: {
            type: Number,
            required: true,
            min: 0,
        },

        orderDate: {
            type: Date,
            default: Date.now,
        },

        receivedDate: {
            type: Date,
        },

        createdByName: {
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

const PurchaseOrder = mongoose.model<IPurchaseOrder>(
    "PurchaseOrder",
    purchaseOrderSchema
);

export default PurchaseOrder;