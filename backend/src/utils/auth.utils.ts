import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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

// ---- email sender (Brevo transactional email over HTTPS) ----
//
// We send through Brevo's HTTP API (port 443) rather than SMTP because most
// managed hosts — Render's free plan included — block outbound SMTP ports
// (25/465/587), so smtp.gmail.com is unreachable from the deployed server even
// with correct credentials. HTTPS is never blocked.
//
// Setup: create a free Brevo account, verify your sender email (e.g. your
// Gmail) under Senders, create an API key, then set:
//   BREVO_API_KEY       — the API key (secret)
//   BREVO_SENDER_EMAIL  — the verified sender address (falls back to EMAIL_USER)
//   BREVO_SENDER_NAME   — optional display name (default "StoreFlow")
// With those unset the app still runs and prints codes to the log.

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL =
  process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || process.env.EMAIL_FROM || '';
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'StoreFlow';

/** Mail is only live when we have both an API key and a verified sender. */
const mailEnabled = Boolean(BREVO_API_KEY && SENDER_EMAIL);

/** Wraps fetch with a timeout so a hung request can't stall the caller. */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Validates the Brevo API key at boot (no email sent), so a misconfiguration
 *  shows up in the logs immediately instead of on the first send. */
export const verifyMailer = async (): Promise<void> => {
  if (!mailEnabled) {
    console.log("[mail] BREVO_API_KEY/sender not set — codes will print to console.");
    return;
  }
  try {
    const res = await fetchWithTimeout(
      'https://api.brevo.com/v3/account',
      { headers: { 'api-key': BREVO_API_KEY as string, accept: 'application/json' } },
      10_000
    );
    if (res.ok) {
      console.log(`[mail] Brevo ready (sending as ${SENDER_EMAIL}).`);
    } else {
      const body = (await res.text().catch(() => '')).slice(0, 200);
      console.error(`[mail] Brevo key check FAILED: HTTP ${res.status} ${body}`);
    }
  } catch (err) {
    console.error("[mail] Brevo verification FAILED:", (err as Error).message);
  }
};

/** Logs the code/URL to console as fallback. */
function logFallback(to: string, content: string, label: string) {
  console.log(`[mail] ${label} for ${to}: ${content}`);
}

/** POSTs one email to Brevo. Resolves to the outcome; never throws. */
async function sendViaBrevo(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; status?: number; body?: string }> {
  const res = await fetchWithTimeout(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY as string,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    },
    15_000
  );
  if (res.ok) return { ok: true, status: res.status };
  return { ok: false, status: res.status, body: (await res.text().catch(() => '')).slice(0, 300) };
}

/** Sends with one retry; never throws. Returns true if accepted by Brevo. */
async function sendMailSafe(
  to: string,
  subject: string,
  html: string,
  label: string
): Promise<boolean> {
  if (!mailEnabled) return false;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await sendViaBrevo(to, subject, html);
      if (r.ok) {
        console.log(`[mail] ${label} sent to ${to}.`);
        return true;
      }
      console.error(`[mail] ${label} attempt ${attempt} rejected: HTTP ${r.status} ${r.body ?? ''}`);
      // 4xx (invalid key, unverified sender, bad address) won't pass on retry.
      if (r.status && r.status >= 400 && r.status < 500) return false;
    } catch (err) {
      console.error(`[mail] ${label} attempt ${attempt} failed:`, (err as Error).message);
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 800));
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
