import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import { UserRole } from '../models/user.model';

// ---- password hashing ----
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

// ---- email sender (Gmail SMTP) ----

const transporter = process.env.EMAIL_USER && process.env.EMAIL_PASS
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      pool: true,
      maxConnections: 3,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

/** Verifies the SMTP connection at boot. */
export const verifyMailer = async (): Promise<void> => {
  if (!transporter) {
    console.log("[mail] EMAIL_USER/PASS not set — codes will print to console.");
    return;
  }
  try {
    await transporter.verify();
    console.log(`[mail] Gmail SMTP ready (${process.env.EMAIL_USER}).`);
  } catch (err) {
    console.error("[mail] Gmail SMTP verification FAILED:", (err as Error).message);
  }
};

/** Logs the code/URL to console as fallback. */
function logFallback(to: string, content: string, label: string) {
  console.log(`[mail] ${label} for ${to}: ${content}`);
}

/** Sends with one retry; never throws. Returns true if sent successfully. */
async function sendMailSafe(
  to: string,
  subject: string,
  html: string,
  label: string
): Promise<boolean> {
  if (!transporter) return false;

  const from = `"StoreFlow" <${process.env.EMAIL_USER}>`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await transporter.sendMail({ from, to, subject, html });
      console.log(`[mail] ${label} sent to ${to}.`);
      return true;
    } catch (err) {
      console.error(`[mail] ${label} attempt ${attempt} failed:`, (err as Error).message);
      if (attempt === 2) return false;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return false;
}

/** @returns true if the email was accepted. */
export const sendPasswordResetCode = async (
  to: string,
  code: string
): Promise<boolean> => {
  logFallback(to, code, 'password-reset');

  return sendMailSafe(
    to,
    'Reset your StoreFlow password',
    `
      <h2>Password Reset</h2>
      <p>You requested to reset your password. Your code is:</p>
      <h1 style="letter-spacing: 4px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
    'password-reset'
  );
};

/** @returns true if the email was accepted. */
export const sendEmailVerificationCode = async (
  to: string,
  code: string
): Promise<boolean> => {
  logFallback(to, code, 'email-verification');

  return sendMailSafe(
    to,
    'Verify your StoreFlow email',
    `
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 4px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
    'email-verification'
  );
};

/** @returns true if the email was accepted. */
export const sendEmployeeInviteEmail = async (
  to: string,
  opts: { inviteUrl: string; inviterName: string; storeName: string; role: string }
): Promise<boolean> => {
  logFallback(to, opts.inviteUrl, 'employee-invite');

  return sendMailSafe(
    to,
    `You've been invited to join ${opts.storeName} on StoreFlow`,
    `
      <h2>You're invited to ${opts.storeName}</h2>
      <p>${opts.inviterName} has invited you to join <strong>${opts.storeName}</strong>
         on StoreFlow as a <strong>${opts.role}</strong>.</p>
      <p>Click below to set your password and finish setting up your account:</p>
      <p><a href="${opts.inviteUrl}"
            style="display:inline-block;padding:10px 18px;background:#131312;color:#fff;border-radius:8px;text-decoration:none;">
            Accept invite</a></p>
      <p>Or paste this link into your browser:<br>${opts.inviteUrl}</p>
      <p>This invite expires in 7 days. If you weren't expecting it, you can ignore this email.</p>
    `,
    'employee-invite'
  );
};
