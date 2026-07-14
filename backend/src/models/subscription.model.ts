import { Schema, model, Types } from 'mongoose';

export type SubscriptionStatus =
  | 'incomplete'
  | 'pending'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface ISubscription {
  _id: Types.ObjectId;
  publicId: string;
  account: Types.ObjectId;
  user: Types.ObjectId;
  plan: Types.ObjectId;
  planVersion: number;
  status: SubscriptionStatus;
  billingInterval: 'monthly' | 'yearly';
  currency: string;
  amountMinor: number;
  provider: 'stripe' | 'paypal' | 'manual' | 'none';
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPriceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancellationReason?: string;
  cancelledAt?: Date;
  pastDueSince?: Date;
  gracePeriodEndsAt?: Date;
  suspendedAt?: Date;
  expiredAt?: Date;
  lastProviderSyncAt?: Date;
  lastEntitlementRefreshAt?: Date;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    account: { type: Schema.Types.ObjectId, ref: 'BillingAccount', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    planVersion: { type: Number, required: true },
    status: {
      type: String,
      enum: ['incomplete', 'pending', 'trialing', 'active', 'past_due', 'grace_period', 'suspended', 'cancelled', 'expired'],
      required: true,
      default: 'pending',
      index: true,
    },
    billingInterval: { type: String, enum: ['monthly', 'yearly'], required: true },
    currency: { type: String, required: true, uppercase: true },
    amountMinor: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: ['stripe', 'paypal', 'manual', 'none'], required: true, default: 'none' },
    providerCustomerId: { type: String, select: false },
    providerSubscriptionId: { type: String, select: false },
    providerPriceId: { type: String },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    trialStart: { type: Date },
    trialEnd: { type: Date },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    pastDueSince: { type: Date },
    gracePeriodEndsAt: { type: Date },
    suspendedAt: { type: Date },
    expiredAt: { type: Date },
    lastProviderSyncAt: { type: Date },
    lastEntitlementRefreshAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

subscriptionSchema.index({ account: 1, status: 1 });
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ plan: 1 });

export const Subscription = model<ISubscription>('Subscription', subscriptionSchema);
