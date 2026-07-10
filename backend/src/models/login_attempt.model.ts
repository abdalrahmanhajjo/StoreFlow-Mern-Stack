import { Schema, model } from 'mongoose';

// Log of every login attempt — feeds account lockout and, later, the
// admin security dashboard (login attempts / blocked IPs view).
export interface ILoginAttempt {
  email: string;
  ip: string;
  success: boolean;
}

const loginAttemptSchema = new Schema<ILoginAttempt>(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    ip: { type: String, required: true },
    success: { type: Boolean, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LoginAttempt = model<ILoginAttempt>('LoginAttempt', loginAttemptSchema);
