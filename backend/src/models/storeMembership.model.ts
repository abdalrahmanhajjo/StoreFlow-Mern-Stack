import { Schema, model, Types } from 'mongoose';

export type StoreRole = 'owner' | 'administrator' | 'manager' | 'cashier' | 'inventory_manager' | 'employee' | 'viewer';

export interface IStoreMembership {
  _id: Types.ObjectId;
  publicId: string;
  store: Types.ObjectId;
  user: Types.ObjectId;
  role: StoreRole;
  status: 'active' | 'invited' | 'suspended' | 'removed';
  invitedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const storeMembershipSchema = new Schema<IStoreMembership>(
  {
    publicId: { type: String, required: true, unique: true, immutable: true, index: true },
    store: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['owner', 'administrator', 'manager', 'cashier', 'inventory_manager', 'employee', 'viewer'],
      required: true,
    },
    status: { type: String, enum: ['active', 'invited', 'suspended', 'removed'], default: 'active' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

storeMembershipSchema.index({ store: 1, user: 1 }, { unique: true });
storeMembershipSchema.index({ user: 1, status: 1 });

export const StoreMembership = model<IStoreMembership>('StoreMembership', storeMembershipSchema);
