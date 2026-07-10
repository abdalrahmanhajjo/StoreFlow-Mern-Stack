import { Schema, model, Types } from 'mongoose';

export type UserRole = 'platform_admin' | 'owner' | 'manager' | 'cashier';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  storeId: Types.ObjectId | null;
  isActive: boolean;

  // --- Email verification state ---
  isEmailVerified: boolean;
  emailVerificationCodeHash: string | null;
  emailVerificationCodeExpires: Date | null;

  // --- Login lockout state (BS-202) ---
  failedLoginAttempts: number;
  lockUntil: Date | null;

  // --- Password reset state (BS-204) ---
  passwordResetTokenHash: string | null;
  passwordResetExpires: Date | null;

  createdAt: Date;
  updatedAt: Date;

  save: (options?: { session?: any }) => Promise<IUser>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: ['platform_admin', 'owner', 'manager', 'cashier'],
      required: true,
    },

    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
      index: true,
    },

    isActive: { type: Boolean, default: true },

    // --- Email verification state ---
    isEmailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerificationCodeHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationCodeExpires: {
      type: Date,
      default: null,
      select: false,
    },

    failedLoginAttempts: { type: Number, default: 0 },

    lockUntil: { type: Date, default: null },

    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);