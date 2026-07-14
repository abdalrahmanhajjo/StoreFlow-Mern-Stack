import { Schema, model, Types } from 'mongoose';

export interface IBillingCustomer {
  _id: Types.ObjectId;
  publicId: string;
  account: Types.ObjectId;
  provider: 'stripe' | 'paypal' | 'manual';
  providerCustomerId: string;
  providerCustomerData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const billingCustomerSchema = new Schema<IBillingCustomer>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    account: { type: Schema.Types.ObjectId, ref: 'BillingAccount', required: true, unique: true, index: true },
    provider: { type: String, enum: ['stripe', 'paypal', 'manual', 'mock'], required: true },
    providerCustomerId: { type: String, required: true },
    providerCustomerData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

billingCustomerSchema.index({ provider: 1, providerCustomerId: 1 }, { unique: true });

export const BillingCustomer = model<IBillingCustomer>('BillingCustomer', billingCustomerSchema);
