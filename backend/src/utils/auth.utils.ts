import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import { UserRole } from '../models/user.model';
import { sendDynamicTemplateEmail } from './mail.utils';

// Re-exported so nothing importing verifyMailer from here needs to change —
// its real home is mail.utils.ts now, alongside the rest of the Gmail transport.
export { verifyMailer } from './mail.utils';

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

// ---- transactional emails ----
// Each of these is now just "which template, which variables" — the actual
// subject/HTML lives in the EmailTemplate collection (admin-editable), not
// hardcoded here. If the referenced slug isn't seeded/active in the DB,
// sendDynamicTemplateEmail logs an error and returns false rather than
// throwing, so registration/reset/invite flows degrade gracefully instead of
// crashing.

/** @returns true if the email was accepted. */
export const sendPasswordResetCode = async (
  to: string,
  code: string
): Promise<boolean> => {
  return sendDynamicTemplateEmail(to, 'password-reset', { code });
};

/** @returns true if the email was accepted. */
export const sendEmailVerificationCode = async (
  to: string,
  code: string
): Promise<boolean> => {
  return sendDynamicTemplateEmail(to, 'email-verification', { code });
};

/** @returns true if the email was accepted.
 *  NOTE: `name` here is the INVITEE's name (matches "Hello {{name}}," in the
 *  seeded employee-invite template) — not the inviter's. If you were passing
 *  an inviter's name into this before, update the call site. */
export const sendEmployeeInviteEmail = async (
  to: string,
  opts: { inviteUrl: string; name: string; storeName: string; role: string }
): Promise<boolean> => {
  return sendDynamicTemplateEmail(to, 'employee-invite', {
    inviteUrl: opts.inviteUrl,
    name: opts.name,
    storeName: opts.storeName,
    role: opts.role,
  });
};
