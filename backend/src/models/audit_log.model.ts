import mongoose, { Schema } from "mongoose";

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
    | "PO_STOCK_INCREASE"
    // New authorization-aligned actions
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "LOGIN"
    | "LOGOUT"
    | "INVITE"
    | "PERMISSION_DENIED"
    | "FEATURE_DENIED"
    | "LIMIT_EXCEEDED";

export interface IAuditLog {
    _id: mongoose.Types.ObjectId;
    actor: mongoose.Types.ObjectId;
    store: mongoose.Types.ObjectId;
    action: AuditAction;
    resourceType: string;
    resourcePublicId?: string;
    result: 'success' | 'failure' | 'denied';
    reasonCode?: string;
    description?: string;
    performedByName?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        actor: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Actor is required"],
            index: true,
        },
        store: {
            type: Schema.Types.ObjectId,
            ref: "Store",
            required: [true, "Store is required"],
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
                "CREATE",
                "UPDATE",
                "DELETE",
                "LOGIN",
                "LOGOUT",
                "INVITE",
                "PERMISSION_DENIED",
                "FEATURE_DENIED",
                "LIMIT_EXCEEDED",
            ],
        },
        resourceType: { type: String, required: true, trim: true },
        resourcePublicId: { type: String, trim: true },
        result: {
            type: String,
            enum: ['success', 'failure', 'denied'],
            default: 'success',
        },
        reasonCode: { type: String, trim: true },
        description: { type: String, trim: true },
        performedByName: { type: String, trim: true, default: "System" },
        metadata: { type: Schema.Types.Mixed },
        ip: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ store: 1, createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export default AuditLog;
