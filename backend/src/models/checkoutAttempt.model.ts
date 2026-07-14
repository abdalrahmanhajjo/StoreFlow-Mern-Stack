import { Schema, model, Types } from 'mongoose';

export interface ICheckoutAttempt {
  _id: Types.ObjectId;
  publicId: string;
  account: Types.ObjectId;
  plan: Types.ObjectId;
  subscription?: Types.ObjectId;
  billingInterval: 'monthly' | 'yearly';
  currency: string;
  amountMinor: number;
  provider: 'stripe' | 'paypal' | 'manual';
  providerSessionId?: string;
  providerSessionUrl?: string;
  providerClientSecret?: string;
  status: 'pending' | 'completed' | 'expired' | 'failed';
  idempotencyKey: string;
  metadata?: Record<string, string>;
  completedAt?: Date;
  expiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const checkoutAttemptSchema = new Schema<ICheckoutAttempt>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    account: { type: Schema.Types.ObjectId, ref: 'BillingAccount', required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    billingInterval: { type: String, enum: ['monthly', 'yearly'], required: true },
    currency: { type: String, required: true, uppercase: true },
    amountMinor: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: ['stripe', 'paypal', 'manual', 'mock'], required: true },
    providerSessionId: { type: String },
    providerSessionUrl: { type: String },
    providerClientSecret: { type: String },
    status: {
      type: String,
      enum: ['pending', 'completed', 'expired', 'failed'],
      required: true,
      default: 'pending',
      index: true,
    },
    idempotencyKey: { type: String, required: true, unique: true },
    metadata: { type: Schema.Types.Mixed },
    completedAt: { type: Date },
    expiredAt: { type: Date },
  },
  { timestamps: true }
);

checkoutAttemptSchema.index({ account: 1, status: 1 });
checkoutAttemptSchema.index({ providerSessionId: 1 }, { sparse: true });

export const CheckoutAttempt = model<ICheckoutAttempt>('CheckoutAttempt', checkoutAttemptSchema);
