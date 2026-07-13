import { Schema, model, Types } from 'mongoose';

export interface IStore {
  _id: Types.ObjectId;
  storeName: string;
  businessType: "grocery" | "restaurant" | "pharmacy" | "retail";
  address: string;
  currency: "USD" | "EUR" | "EGP";
  taxRate: number;
  status: 'pending' | 'active' | 'suspended';
  planId: Types.ObjectId | null;
  taxRegistrationId?: string;
  ownerId: Types.ObjectId;
  subscription: {
    plan: string;
    trialEndsAt: Date;
    status: "trial" | "active" | "expired";
  };
  isVerified: boolean;
}

const storeSchema = new Schema<IStore>(
  {
    storeName: { type: String, required: true, trim: true },
    businessType: {
      type: String,
      enum: [ "grocery", "restaurant", "pharmacy", "retail"],
      required: true,
    },
    address: { type: String, required: true, trim: true },
    currency: { type: String, enum: ['USD', 'EUR', 'EGP'], default: 'USD' },
    taxRate: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
    // No default: an explicit null would still be indexed and collide with the
    // next store registered without a tax ID — sparse only skips absent fields.
    taxRegistrationId: { type: String, unique: true, sparse: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subscription: {
      planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
      trialEndsAt: { type: Date },
      status: { type: String, enum: ['trial', 'active', 'expired'], default: 'trial' }
    },
    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Store = model<IStore>('Store', storeSchema);
