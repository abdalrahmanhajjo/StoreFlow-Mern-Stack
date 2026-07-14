import { Schema, model, Types } from 'mongoose';

export interface IProcessedWebhookEvent {
  _id: Types.ObjectId;
  provider: string;
  eventId: string;
  eventType: string;
  receivedAt: Date;
  processedAt?: Date;
  status: 'received' | 'processed' | 'failed' | 'ignored';
  attempts: number;
  lastError?: string;
  lastErrorCode?: string;
}

const processedWebhookEventSchema = new Schema<IProcessedWebhookEvent>({
  provider: { type: String, required: true },
  eventId: { type: String, required: true },
  eventType: { type: String, required: true },
  receivedAt: { type: Date, required: true, default: Date.now },
  processedAt: { type: Date },
  status: {
    type: String,
    enum: ['received', 'processed', 'failed', 'ignored'],
    required: true,
    default: 'received',
  },
  attempts: { type: Number, default: 1 },
  lastError: { type: String },
  lastErrorCode: { type: String },
});

processedWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
processedWebhookEventSchema.index({ status: 1 });

export const ProcessedWebhookEvent = model<IProcessedWebhookEvent>(
  'ProcessedWebhookEvent',
  processedWebhookEventSchema
);
