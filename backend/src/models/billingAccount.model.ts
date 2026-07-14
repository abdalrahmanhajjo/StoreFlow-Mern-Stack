import { Schema, model, Types } from 'mongoose';

export interface IBillingAccount {
  _id: Types.ObjectId;
  publicId: string;
  owner: Types.ObjectId;
  name: string;
  email: string;
  country?: string;
  taxId?: string;
  billingEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const billingAccountSchema = new Schema<IBillingAccount>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    country: { type: String },
    taxId: { type: String },
    billingEmail: { type: String, lowercase: true, trim: true },
  },
  { timestamps: true }
);


export const BillingAccount = model<IBillingAccount>('BillingAccount', billingAccountSchema);
