import { Schema, model, Types } from 'mongoose';

export interface IStore {
  storeName: string;
  address?: string;
  currency: string;
  taxRate: number;
  status: 'pending' | 'active' | 'suspended';
  ownerId: Types.ObjectId;
}

const storeSchema = new Schema<IStore>(
  {
    storeName: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    currency: { type: String, default: 'USD' },
    taxRate: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Store = model<IStore>('Store', storeSchema);
