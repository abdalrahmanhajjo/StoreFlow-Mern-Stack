import mongoose, { Schema, Document } from "mongoose";

export type LoyaltyType = "earn" | "redeem" | "adjust";
export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface ILoyaltyLedger extends Document {
    customerId: mongoose.Types.ObjectId;
    type: LoyaltyType;
    points: number;
    amountSpent?: number;
    balanceAfter: number;
    tierAfter?: LoyaltyTier;
    description?: string;
    reference?: string;
    isActive: boolean;
}

const loyaltyLedgerSchema = new Schema<ILoyaltyLedger>(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: [true, "Customer ID is required"],
        },

        type: {
            type: String,
            enum: ["earn", "redeem", "adjust"],
            required: [true, "Loyalty type is required"],
        },

        points: {
            type: Number,
            required: [true, "Points are required"],
        },

        amountSpent: {
            type: Number,
            default: 0,
            min: 0,
        },

        balanceAfter: {
            type: Number,
            required: [true, "Balance after is required"],
            min: 0,
        },

        tierAfter: {
            type: String,
            enum: ["Bronze", "Silver", "Gold", "Platinum"],
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