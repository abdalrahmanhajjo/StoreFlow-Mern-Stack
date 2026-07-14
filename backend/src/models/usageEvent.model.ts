import { Schema, model, Types } from 'mongoose';

export interface IUsageEvent {
  _id: Types.ObjectId;
  publicId: string;
  account: Types.ObjectId;
  subscription: Types.ObjectId;
  store?: Types.ObjectId;
  metric: string;
  quantity: number;
  idempotencyKey: string;
  occurredAt: Date;
  metadata?: Record<string, string>;
  createdAt: Date;
}

const usageEventSchema = new Schema<IUsageEvent>({
  publicId: { type: String, required: true, unique: true, immutable: true, index: true },
  account: { type: Schema.Types.ObjectId, ref: 'BillingAccount', required: true, index: true },
  subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  metric: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  idempotencyKey: { type: String, required: true, unique: true },
  occurredAt: { type: Date, required: true, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

usageEventSchema.index({ account: 1, metric: 1, occurredAt: -1 });
usageEventSchema.index({ subscription: 1, metric: 1 });

export const UsageEvent = model<IUsageEvent>('UsageEvent', usageEventSchema);
