import mongoose, { Schema, Document } from "mongoose";

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface IPurchaseHistory {
  productName: string;
  amount: number;
  purchaseDate: Date;
  note?: string;
}

export interface ICustomer extends Document {
    storeId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  totalSpent: number;
  loyaltyPoints: number;
  lifetimePointsEarned: number;
  loyaltyTier: LoyaltyTier;
  purchaseHistory: IPurchaseHistory[];
  isActive: boolean;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    purchaseDate: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const customerSchema = new Schema<ICustomer>(
  {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: [true, "storeId is required"],
            index: true,
        },
    name: {
      type: String,
      required: [true, "Customer name is required"],
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

    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },

    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },

    lifetimePointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },

    loyaltyTier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },

    purchaseHistory: {
      type: [purchaseHistorySchema],
      default: [],
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

const Customer = mongoose.model<ICustomer>("Customer", customerSchema);

export default Customer;