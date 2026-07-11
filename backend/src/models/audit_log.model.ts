import mongoose, { Schema, Document } from "mongoose";

export type AuditAction =
    | "CREATE_SALE"
    | "VOID_SALE"
    | "STOCK_DECREMENT"
    | "STOCK_RESTORE"
    | "LOYALTY_EARNED"
    | "LOYALTY_REVERSED"
    | "CREATE_PRODUCT"
    | "UPDATE_PRODUCT"
    | "DELETE_PRODUCT"
    | "STOCK_ADJUSTMENT"
    | "RECEIVE_PURCHASE_ORDER"
    | "PO_STOCK_INCREASE";

export interface IAuditLog extends Document {
    storeId: mongoose.Types.ObjectId;
    action: AuditAction;
    entity: string;
    entityId?: mongoose.Types.ObjectId;
    description: string;
    performedByName?: string;
    metadata?: any;
    isActive: boolean;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: [true, "storeId is required"],
            index: true,
        },
        action: {
            type: String,
            required: [true, "Action is required"],
            enum: [
                "CREATE_SALE",
                "VOID_SALE",
                "STOCK_DECREMENT",
                "STOCK_RESTORE",
                "LOYALTY_EARNED",
                "LOYALTY_REVERSED",
                "CREATE_PRODUCT",
                "UPDATE_PRODUCT",
                "DELETE_PRODUCT",
                "STOCK_ADJUSTMENT",
                "RECEIVE_PURCHASE_ORDER",
                "PO_STOCK_INCREASE",
            ],
        },

        entity: {
            type: String,
            required: [true, "Entity is required"],
            trim: true,
        },

        entityId: {
            type: Schema.Types.ObjectId,
        },

        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
        },

        performedByName: {
            type: String,
            trim: true,
            default: "System",
        },

        metadata: {
            type: Schema.Types.Mixed,
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

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;