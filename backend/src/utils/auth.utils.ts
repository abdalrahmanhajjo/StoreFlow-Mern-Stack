import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from "../models/user.model";

// ---- password hashing ---- 12: salt rounds
export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const comparePassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// ---- access token (short-lived JWT) ----
export interface AccessTokenPayload {
  sub: string;
  storeId: string | null;
  role: UserRole;
}

export const signAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, { expiresIn: '15m' });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as AccessTokenPayload;

// ---- refresh / reset tokens ----
// These are random opaque strings, NOT JWTs — only their hash is stored,
// so they can be individually revoked (a JWT can't be un-issued).
export const generateRawToken = (bytes = 40) => crypto.randomBytes(bytes).toString('hex');
export const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

// ---- email stub — swap for real email sending later ----
export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  console.log(`[email stub] password reset link for ${to}: ${resetUrl}`);
};
