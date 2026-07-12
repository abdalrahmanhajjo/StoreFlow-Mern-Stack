import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

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

// ---- email sender (SendGrid primary, SMTP fallback) ----

const useSendGrid = Boolean(process.env.SENDGRID_API_KEY);
if (useSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  console.log(`[mail] SendGrid configured (sender ${process.env.EMAIL_USER}).`);
}

const emailPort = Number(process.env.EMAIL_PORT) || 465;
const smtpTransporter = useSendGrid
  ? null
  : nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: emailPort,
      secure: emailPort === 465,
      requireTLS: emailPort !== 465,
      pool: true,
      maxConnections: 3,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

/** Verifies the email sender at boot. */
export const verifyMailer = async (): Promise<void> => {
  if (!process.env.EMAIL_USER) {
    console.log("[mail] EMAIL_USER not set — verification codes will print to the console.");
    return;
  }
  if (useSendGrid) {
    try {
      await sgMail.send({
        to: process.env.EMAIL_USER,
        from: `"${process.env.EMAIL_FROM || 'StoreFlow'}" <${process.env.EMAIL_USER}>`,
        subject: 'StoreFlow mailer test',
        text: 'SendGrid is configured and working.',
      });
      console.log(`[mail] SendGrid ready (as ${process.env.EMAIL_USER}).`);
    } catch (err) {
      console.error("[mail] SendGrid verification FAILED:", (err as Error).message);
    }
    return;
  }
  try {
    await smtpTransporter!.verify();
    console.log(`[mail] SMTP ready (${process.env.EMAIL_HOST} as ${process.env.EMAIL_USER}).`);
  } catch (err) {
    console.error("[mail] SMTP verification FAILED — emails will not send:", (err as Error).message);
  }
};

/** Sends with one retry on transient failures; never throws. */
async function sendMailSafe(
  msg: { to: string; subject: string; html: string; replyTo?: string },
  label: string
): Promise<boolean> {
  const from = `"${process.env.EMAIL_FROM || 'StoreFlow'}" <${process.env.EMAIL_USER}>`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (useSendGrid) {
        await sgMail.send({ ...msg, from });
      } else {
        await smtpTransporter!.sendMail({ ...msg, from });
      }
      return true;
    } catch (err) {
      console.error(`[mail] ${label} send attempt ${attempt} failed:`, (err as Error).message);
      if (attempt === 2) return false;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return false;
}

const emailConfigured = () => Boolean(process.env.EMAIL_USER);

/** @returns true if the email was accepted. */
export const sendPasswordResetCode = async (
  to: string,
  code: string
): Promise<boolean> => {
  if (!emailConfigured()) {
    console.log(`[dev mail] Password reset code for ${to}: ${code}`);
    return true;
  }

  return sendMailSafe({
    to,
    subject: 'Reset your StoreFlow password',
    html: `
      <h2>Password Reset</h2>
      <p>You requested to reset your password. Your code is:</p>
      <h1 style="letter-spacing: 4px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
  }, 'password-reset');
};

/** @returns true if the email was accepted. */
export const sendEmailVerificationCode = async (
  to: string,
  code: string
): Promise<boolean> => {
  if (!emailConfigured()) {
    console.log(`[dev mail] Email verification code for ${to}: ${code}`);
    return true;
  }

  return sendMailSafe({
    to,
    subject: 'Verify your StoreFlow email',
    html: `
      <h2>Email Verification</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 4px;">${code}</h1>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  }, 'email-verification');
};

/** @returns true if the email was accepted. */
export const sendEmployeeInviteEmail = async (
  to: string,
  opts: { inviteUrl: string; inviterName: string; storeName: string; role: string }
): Promise<boolean> => {
  if (!emailConfigured()) {
    console.log(`[dev mail] Employee invite for ${to}: ${opts.inviteUrl}`);
    return true;
  }

  return sendMailSafe({
    to,
    subject: `You've been invited to join ${opts.storeName} on StoreFlow`,
    html: `
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
  }, 'employee-invite');
};
