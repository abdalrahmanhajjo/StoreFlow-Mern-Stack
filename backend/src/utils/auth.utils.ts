import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

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

// ---- email sender ----

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const smtp = !process.env.RESEND_API_KEY && process.env.EMAIL_USER
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      requireTLS: Number(process.env.EMAIL_PORT) !== 465,
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

/** Verifies the email sender at boot. */
export const verifyMailer = async (): Promise<void> => {
  if (resend) {
    console.log(`[mail] Resend ready (key ${process.env.RESEND_API_KEY!.slice(0, 8)}…).`);
    console.log("[mail] Codes are always printed to logs as fallback.");
    return;
  }
  if (smtp) {
    try {
      await smtp.verify();
      console.log(`[mail] SMTP ready (${process.env.EMAIL_HOST || 'smtp-relay.brevo.com'} as ${process.env.EMAIL_USER}).`);
    } catch (err) {
      console.error("[mail] SMTP verification FAILED:", (err as Error).message);
    }
    return;
  }
  console.log("[mail] No sender configured — codes will print to logs.");
};

/** Try to send via configured provider; always logs the code as fallback. */
async function trySend(
  to: string,
  codeOrUrl: string,
  label: string
): Promise<void> {
  // Always log so the user can find it in Render logs
  console.log(`[mail] ${label} for ${to}: ${codeOrUrl}`);
}

/** Sends with one retry; never throws. */
async function sendMailSafe(
  msg: { to: string; subject: string; html: string },
  label: string
): Promise<boolean> {
  const from = process.env.EMAIL_FROM
    ? process.env.EMAIL_FROM
    : (resend ? 'onboarding@resend.dev' : (process.env.EMAIL_USER || 'noreply@storeflow.app'));

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (resend) {
        const { error } = await resend.emails.send({
          from: `StoreFlow <${from}>`,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
        });
        if (error) throw error;
      } else if (smtp) {
        await smtp.sendMail({ from: `"StoreFlow" <${from}>`, ...msg });
      }
      console.log(`[mail] ${label} sent to ${msg.to}.`);
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
  trySend(to, code, 'password-reset');
  if (!resend && !smtp) return true;

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
  trySend(to, code, 'email-verification');
  if (!resend && !smtp) return true;

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
  trySend(to, opts.inviteUrl, 'employee-invite');
  if (!resend && !smtp) return true;

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
