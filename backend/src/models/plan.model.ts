import { Schema, model, Types } from 'mongoose';

export interface IPlan {
  _id: Types.ObjectId;
  publicId: string;
  code: string;
  name: string;
  description: string;
  shortDescription?: string;
  isActive: boolean;
  isPublic: boolean;
  isRecommended: boolean;
  displayOrder: number;
  supportedIntervals: Array<'monthly' | 'yearly'>;
  billing: {
    currency: string;
    monthlyPriceMinor: number;
    yearlyPriceMinor: number;
  };
  providerPriceIds: {
    stripe?: {
      monthly?: string;
      yearly?: string;
    };
  };
  trial: {
    enabled: boolean;
    durationDays: number;
    requiresPaymentMethod: boolean;
  };
  limits: {
    stores: number;
    membersPerStore: number;
    productsPerStore: number;
    ordersPerMonth: number;
    customersPerStore: number;
    exportsPerMonth: number;
    inventoryLocations: number;
    apiRequestsPerMonth: number;
    storageBytes: number;
  };
  features: {
    analytics: boolean;
    advancedAnalytics: boolean;
    exportReports: boolean;
    customBranding: boolean;
    multiStore: boolean;
    inventoryManagement: boolean;
    supplierManagement: boolean;
    employeeManagement: boolean;
    discountManagement: boolean;
    integrations: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
    auditLogs: boolean;
  };
  version: number;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true, immutable: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    shortDescription: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    isPublic: { type: Boolean, default: true },
    isRecommended: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    supportedIntervals: { type: [String], default: ['monthly', 'yearly'] },
    billing: {
      currency: { type: String, required: true, uppercase: true },
      monthlyPriceMinor: { type: Number, required: true, min: 0 },
      yearlyPriceMinor: { type: Number, required: true, min: 0 },
    },
    providerPriceIds: {
      stripe: {
        monthly: { type: String },
        yearly: { type: String },
      },
    },
    trial: {
      enabled: { type: Boolean, default: false },
      durationDays: { type: Number, default: 0, min: 0 },
      requiresPaymentMethod: { type: Boolean, default: true },
    },
    // Limits use -1 to mean "unlimited" (mapped to null by the entitlement
    // service and skipped by checkPlanLimit).
    limits: {
      stores: { type: Number, required: true, min: -1, default: 1 },
      membersPerStore: { type: Number, required: true, min: -1, default: 1 },
      productsPerStore: { type: Number, required: true, min: -1, default: 50 },
      ordersPerMonth: { type: Number, required: true, min: -1, default: 100 },
      customersPerStore: { type: Number, required: true, min: -1, default: 100 },
      exportsPerMonth: { type: Number, default: 10, min: -1 },
      inventoryLocations: { type: Number, required: true, min: -1, default: 1 },
      apiRequestsPerMonth: { type: Number, required: true, min: -1, default: 1000 },
      storageBytes: { type: Number, required: true, min: -1, default: 52428800 },
    },
    features: {
      analytics: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      exportReports: { type: Boolean, default: false },
      customBranding: { type: Boolean, default: false },
      multiStore: { type: Boolean, default: false },
      inventoryManagement: { type: Boolean, default: true },
      supplierManagement: { type: Boolean, default: false },
      employeeManagement: { type: Boolean, default: false },
      discountManagement: { type: Boolean, default: false },
      integrations: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      auditLogs: { type: Boolean, default: false },
    },
    version: { type: Number, default: 1, min: 1 },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
  },
  { timestamps: true }
);

export const Plan = model<IPlan>('Plan', planSchema);
