import { Schema, model, Types } from 'mongoose';

export interface IUsageCounter {
  _id: Types.ObjectId;
  account: Types.ObjectId;
  subscription: Types.ObjectId;
  store?: Types.ObjectId;
  metric: string;
  periodStart?: Date;
  periodEnd?: Date;
  value: number;
  reserved: number;
}

const usageCounterSchema = new Schema<IUsageCounter>({
  account: { type: Schema.Types.ObjectId, ref: 'BillingAccount', required: true, index: true },
  subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
  store: { type: Schema.Types.ObjectId, ref: 'Store' },
  metric: { type: String, required: true },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  value: { type: Number, default: 0, min: 0 },
  reserved: { type: Number, default: 0, min: 0 },
});

usageCounterSchema.index({ account: 1, metric: 1, periodStart: 1, periodEnd: 1 }, { unique: true });

export const UsageCounter = model<IUsageCounter>('UsageCounter', usageCounterSchema);
