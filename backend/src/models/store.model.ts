import { Schema, model, Types } from 'mongoose';

export interface IStore {
  _id: Types.ObjectId;
  publicId: string;
  owner: Types.ObjectId;
  name: string;
  slug: string;
  businessType: 'grocery' | 'restaurant' | 'pharmacy' | 'retail';
  address: string;
  currency: 'USD' | 'EUR' | 'EGP';
  taxRate: number;
  taxRegistrationId?: string;
  status: 'pending' | 'active' | 'suspended' | 'archived';
  isVerified: boolean;
  planId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStore>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    businessType: {
      type: String,
      enum: ['grocery', 'restaurant', 'pharmacy', 'retail'],
      required: true,
    },
    address: { type: String, required: true, trim: true },
    currency: { type: String, enum: ['USD', 'EUR', 'EGP'], default: 'USD' },
    taxRate: { type: Number, default: 0 },
    taxRegistrationId: { type: String, unique: true, sparse: true },
    status: { type: String, enum: ['pending', 'active', 'suspended', 'archived'], default: 'pending', index: true },
    isVerified: { type: Boolean, default: false },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', default: null, index: true },
  },
  { timestamps: true }
);

export const Store = model<IStore>('Store', storeSchema);
