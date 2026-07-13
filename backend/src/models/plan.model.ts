import { Schema, model, Types } from 'mongoose';

export interface IPlan {
  _id: Types.ObjectId;
  name: string;
  slug: string;              // stable reference key, e.g. 'free' | 'pro' | 'enterprise'
  priceMonthly: number;      // whole currency units, e.g. 49 = $49/mo
  description: string;
  isPopular: boolean;
  isActive: boolean;         // soft-disable without deleting (keeps historical stores intact)
  limits: {
    productLimit: number | null;   // null = unlimited
    staffAccounts: number | null;  // null = unlimited
  };
  features: {
    suppliersAndPurchaseOrders: boolean;
    fullReporting: boolean;
    advancedAnalytics: boolean;
    multiBranch: boolean;
    prioritySupport: boolean;
  };
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    priceMonthly: { type: Number, required: true, min: 0 },
    description: { type: String, default: '', trim: true },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    limits: {
      productLimit: { type: Number, default: null },
      staffAccounts: { type: Number, default: null },
    },
    features: {
      suppliersAndPurchaseOrders: { type: Boolean, default: false },
      fullReporting: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      multiBranch: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
    },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Plan = model<IPlan>('Plan', planSchema);