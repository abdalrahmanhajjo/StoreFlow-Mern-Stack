import mongoose, { Schema, Document } from "mongoose";

export type LoyaltyTransactionType = "earn" | "redeem" | "adjust";

export interface ILoyaltyLedger extends Document {
    customerId: mongoose.Types.ObjectId;
    type: LoyaltyTransactionType;
    points: number;
    amountSpent?: number;
    balanceAfter: number;
    description?: string;
    reference?: string;
    isActive: boolean;
}

const loyaltyLedgerSchema = new Schema<ILoyaltyLedger>(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: [true, "Customer is required"],
        },

        type: {
            type: String,
            enum: ["earn", "redeem", "adjust"],
            required: [true, "Transaction type is required"],
        },

        points: {
            type: Number,
            required: [true, "Points are required"],
        },

        amountSpent: {
            type: Number,
            min: [0, "Amount spent cannot be negative"],
        },

        balanceAfter: {
            type: Number,
            required: true,
            min: [0, "Balance cannot be negative"],
        },

        description: {
            type: String,
            trim: true,
        },

        reference: {
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

const LoyaltyLedger = mongoose.model<ILoyaltyLedger>(
    "LoyaltyLedger",
    loyaltyLedgerSchema
);

export default LoyaltyLedger;