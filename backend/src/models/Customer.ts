import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseHistory {
  productName?: string;
  amount: number;
  purchaseDate: Date;
  note?: string;
}

export interface ICustomer extends Document {
  name: string;
  phone?: string;
  email?: string;
  totalSpent: number;
  loyaltyPoints: number;
  purchaseHistory: IPurchaseHistory[];
  isActive: boolean;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>(
  {
    productName: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
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
      min: [0, "Total spent cannot be negative"],
    },

    loyaltyPoints: {
      type: Number,
      default: 0,
      min: [0, "Loyalty points cannot be negative"],
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