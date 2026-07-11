import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import { UserRole } from '../models/user.model';

// ---- password hashing ----
// 12 = salt rounds
export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

export const comparePassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

// ---- access token (short-lived JWT) ----
export interface AccessTokenPayload {
  sub: string;
  storeId: string | null;
  role: UserRole;
}

export const signAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: '15m',
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET as string
  ) as AccessTokenPayload;

// ---- refresh / reset tokens ----
export const generateRawToken = (bytes = 40) =>
  crypto.randomBytes(bytes).toString('hex');

export const hashToken = (raw: string) =>
  crypto.createHash('sha256').update(raw).digest('hex');

// ---- real email sender ----
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Without SMTP configured (local dev), print instead of send — otherwise
// registration would 500 and roll back before the code ever reaches anyone.
const emailConfigured = () =>
  Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER);

export const sendPasswordResetCode = async (
  to: string,
  code: string
) => {
  if (!emailConfigured()) {
    console.log(`[dev mail] Password reset code for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM || 'StoreFlow'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your StoreFlow password',
    html: `
      <h2>Password Reset</h2>
      <p>You requested to reset your password. Your code is:</p>
      <h1 style="letter-spacing: 4px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
};

export const sendEmailVerificationCode = async (
  to: string,
  code: string
) => {
  if (!emailConfigured()) {
    console.log(`[dev mail] Email verification code for ${to}: ${code}`);
    return;
  }

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM || 'StoreFlow'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your StoreFlow email',
    html: `
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 4px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });
};