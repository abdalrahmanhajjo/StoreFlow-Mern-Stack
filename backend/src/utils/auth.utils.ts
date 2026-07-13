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

// ---- email sender (Gmail API over HTTPS) ----
//
// We send through the Gmail REST API (https://gmail.googleapis.com, port 443)
// rather than SMTP. Managed hosts — Render's free plan included — block
// outbound SMTP ports (25/465/587), so smtp.gmail.com is unreachable from the
// deployed server. HTTPS is never blocked, and the Gmail API sends straight
// from your own Gmail — no third-party email service involved.
//
// One-time setup (full walkthrough in DEPLOY.md):
//   1. Google Cloud Console → new project → enable the "Gmail API".
//   2. OAuth consent screen → External → add the scope
//      https://www.googleapis.com/auth/gmail.send → set Publishing status to
//      "In production" (Testing mode expires the refresh token after 7 days).
//   3. Credentials → create an OAuth client ID (Web application).
//   4. Mint a refresh token once (OAuth Playground, using your own client id
//      + secret, authorizing the gmail.send scope).
// Then set these env vars:
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
//   GMAIL_SENDER       — the Gmail address you authorized (e.g. you@gmail.com)
//   GMAIL_SENDER_NAME  — optional display name (default "StoreFlow")
// With these unset the app still runs and prints codes to the log.

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_SENDER = process.env.GMAIL_SENDER || process.env.EMAIL_USER || '';
const SENDER_NAME = process.env.GMAIL_SENDER_NAME || 'StoreFlow';

/** Mail is only live when the full OAuth set + sender address are present. */
const mailEnabled = Boolean(
  GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_SENDER
);

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

// Google access tokens live ~1h; cache and reuse until a minute before expiry.
let cachedToken: { value: string; expiresAt: number } | null = null;

/** Exchanges the long-lived refresh token for a short-lived access token. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const res = await fetchWithTimeout(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID as string,
        client_secret: GMAIL_CLIENT_SECRET as string,
        refresh_token: GMAIL_REFRESH_TOKEN as string,
        grant_type: 'refresh_token',
      }).toString(),
    },
    10_000
  );
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300);
    // invalid_grant almost always means the refresh token expired (OAuth app
    // still in "Testing") or was revoked — re-mint it with the app published.
    throw new Error(`token refresh HTTP ${res.status} ${body}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

function toBase64Url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** RFC 822 MIME message, base64url-encoded as the Gmail API expects. */
function buildRawMessage(to: string, subject: string, html: string): string {
  const headers = [
    `From: "${SENDER_NAME}" <${GMAIL_SENDER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
  ].join('\r\n');
  return toBase64Url(`${headers}\r\n\r\n${html}`);
}

/** Validates the OAuth credentials at boot (no email sent), so a
 *  misconfiguration shows up in the logs immediately. */
export const verifyMailer = async (): Promise<void> => {
  if (!mailEnabled) {
    console.log("[mail] Gmail API not configured — codes will print to console.");
    return;
  }
  try {
    await getAccessToken();
    console.log(`[mail] Gmail API ready (sending as ${GMAIL_SENDER}).`);
  } catch (err) {
    console.error("[mail] Gmail API auth FAILED:", (err as Error).message);
  }
};

/** Logs the code/URL to console as fallback. */
function logFallback(to: string, content: string, label: string) {
  console.log(`[mail] ${label} for ${to}: ${content}`);
}

/** Sends one message via the Gmail API. Resolves to the outcome; never throws. */
async function sendViaGmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; status?: number; body?: string }> {
  const token = await getAccessToken();
  const res = await fetchWithTimeout(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ raw: buildRawMessage(to, subject, html) }),
    },
    15_000
  );
  if (res.ok) return { ok: true, status: res.status };
  return { ok: false, status: res.status, body: (await res.text().catch(() => '')).slice(0, 300) };
}

/** Sends with one retry; never throws. Returns true if accepted by Gmail. */
async function sendMailSafe(
  to: string,
  subject: string,
  html: string,
  label: string
): Promise<boolean> {
  if (!mailEnabled) return false;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await sendViaGmail(to, subject, html);
      if (r.ok) {
        console.log(`[mail] ${label} sent to ${to}.`);
        return true;
      }
      console.error(`[mail] ${label} attempt ${attempt} rejected: HTTP ${r.status} ${r.body ?? ''}`);
      if (r.status === 401) {
        // Access token expired/revoked — drop the cache and retry with a fresh one.
        cachedToken = null;
      } else if (r.status && r.status >= 400 && r.status < 500) {
        // 403 (scope/consent) or 400 (bad address) won't pass on retry.
        return false;
      }
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
