import { Schema, model, Types } from 'mongoose';

export interface IInvoice {
  _id: Types.ObjectId;
  publicId: string;
  account: Types.ObjectId;
  subscription: Types.ObjectId;
  provider: string;
  providerInvoiceId: string;
  number?: string;
  status: string;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  amountPaidMinor: number;
  amountDueMinor: number;
  periodStart?: Date;
  periodEnd?: Date;
  dueDate?: Date;
  paidAt?: Date;
  hostedInvoiceUrl?: string;
  receiptUrl?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    account: { type: Schema.Types.ObjectId, ref: 'BillingAccount', required: true, index: true },
    subscription: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    provider: { type: String, required: true },
    providerInvoiceId: { type: String, required: true },
    number: { type: String },
    status: { type: String, required: true },
    currency: { type: String, required: true, uppercase: true },
    subtotalMinor: { type: Number, required: true, min: 0 },
    discountMinor: { type: Number, default: 0, min: 0 },
    taxMinor: { type: Number, default: 0, min: 0 },
    totalMinor: { type: Number, required: true, min: 0 },
    amountPaidMinor: { type: Number, default: 0, min: 0 },
    amountDueMinor: { type: Number, default: 0, min: 0 },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    dueDate: { type: Date },
    paidAt: { type: Date },
    hostedInvoiceUrl: { type: String },
    receiptUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

invoiceSchema.index({ account: 1, status: 1 });
invoiceSchema.index({ provider: 1, providerInvoiceId: 1 }, { unique: true });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
