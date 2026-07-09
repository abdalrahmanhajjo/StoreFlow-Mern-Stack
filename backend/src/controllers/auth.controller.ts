import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { User } from '../models/user.model'; // adjust path/casing to match your existing file
import { Store } from '../models/store.model';
import { RefreshToken } from '../models/refresh_token.model';
import { LoginAttempt } from '../models/login_attempt.model';
import {
  hashPassword,
  comparePassword,
  signAccessToken,
  generateRawToken,
  hashToken,
  sendPasswordResetEmail,
} from '../utils/auth.utils';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;
const RESET_TOKEN_TTL_MINUTES = 30;

const cookieOptions = (expires?: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  expires,
});

// Issues a fresh access + refresh token pair and stores the refresh token's hash.
const issueTokens = async (user: any) => {
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    storeId: user.storeId ? user.storeId.toString() : null,
    role: user.role,
  });

  const rawRefreshToken = generateRawToken();
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: refreshTokenExpiresAt,
  });

  return { accessToken, rawRefreshToken, refreshTokenExpiresAt };
};

// ---------------------------------------------------------------------------
// BS-201 — Register store + owner
// ---------------------------------------------------------------------------
export const register = async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: input.email });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

    const passwordHash = await hashPassword(input.password);

    // Create owner with phone and ID verification
    const owner = await User.create({
      name: input.ownerName,
      email: input.email,
      passwordHash,
      role: 'owner',
      storeId: null,
      phone: {
        countryCode: input.phone.countryCode,
        number: input.phone.number,
      },
      idVerification: {
        type: input.idVerification.type,
        number: input.idVerification.number,
      },
      emailVerified: false,
    });

    try {
      // Create store with all required fields
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

      // Ensure currency is one of the allowed values
      const validCurrencies = ['USD', 'EUR', 'EGP'];
      const currency = (validCurrencies.includes(input.currency) ? input.currency : 'USD') as 'USD' | 'EUR' | 'EGP';

      const storeData = {
        storeName: input.storeName,
        address: input.address,
        businessType: input.businessType,
        currency,
        taxRegistrationId: input.taxRegistrationId || undefined,
        status: 'pending' as const,
        ownerId: owner._id,
        subscription: {
          plan: 'trial',
          trialEndsAt,
          status: 'trial' as const,
        },
        isVerified: false,
      };

      const store = await Store.create(storeData) as any;

      owner.storeId = store._id;
      await owner.save();

      res.status(201).json({
        message: 'Store registered. Awaiting platform admin approval.',
        data: { userId: owner._id, storeId: store._id },
      });
    } catch (storeErr) {
      // Store creation (or the follow-up save) failed — clean up the
      // owner we already created so we don't leave a storeless account behind.
      await User.deleteOne({ _id: owner._id });
      throw storeErr;
    }
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: 'Validation failed', errors: err.flatten() });
    console.error(err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// ---------------------------------------------------------------------------
// BS-202 — Login (lockout after N fails, rotating refresh token)
// ---------------------------------------------------------------------------
export const login = async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const ip = req.ip ?? 'unknown';

    const user = await User.findOne({ email: input.email }).select('+passwordHash');

    const invalidCreds = () => res.status(401).json({ message: 'Invalid email or password' });

    if (!user) {
      await LoginAttempt.create({ email: input.email, ip, success: false });
      return invalidCreds();
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      await LoginAttempt.create({ email: input.email, ip, success: false });
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({ message: `Account locked. Try again in ${minutesLeft} minute(s).` });
    }

    const passwordOk = await comparePassword(input.password, user.passwordHash);

    if (!passwordOk) {
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
      if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      await LoginAttempt.create({ email: input.email, ip, success: false });
      return invalidCreds();
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    await LoginAttempt.create({ email: input.email, ip, success: true });

    const { accessToken, rawRefreshToken, refreshTokenExpiresAt } = await issueTokens(user);
    res.cookie(REFRESH_COOKIE, rawRefreshToken, cookieOptions(refreshTokenExpiresAt));

    res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId },
    });
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: 'Validation failed', errors: err.flatten() });
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
};

// ---------------------------------------------------------------------------
// BS-203 — Refresh / Logout / Me
// ---------------------------------------------------------------------------
export const refresh = async (req: Request, res: Response) => {
  try {
    const incoming = req.cookies?.[REFRESH_COOKIE];
    if (!incoming) return res.status(401).json({ message: 'No refresh token provided' });

    const tokenHash = hashToken(incoming);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored) return res.status(401).json({ message: 'Invalid refresh token' });

    if (stored.revokedAt) {
      // Reuse of an already-rotated token — likely theft. Kill every active session.
      await RefreshToken.updateMany({ userId: stored.userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
      return res.status(401).json({ message: 'Refresh token reuse detected — all sessions revoked' });
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const user = await User.findById(stored.userId);
    if (!user) return res.status(401).json({ message: 'Account no longer available' });

    const { accessToken, rawRefreshToken, refreshTokenExpiresAt } = await issueTokens(user);

    stored.revokedAt = new Date();
    await stored.save();

    res.cookie(REFRESH_COOKIE, rawRefreshToken, cookieOptions(refreshTokenExpiresAt));
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not refresh session' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const incoming = req.cookies?.[REFRESH_COOKIE];
  if (incoming) {
    await RefreshToken.updateOne({ tokenHash: hashToken(incoming), revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).send();
};

export const me = async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user._id, name: user.name, email: user.email, role: user.role, storeId: user.storeId });
};

// ---------------------------------------------------------------------------
// BS-204 — Password reset via time-limited emailed token
// ---------------------------------------------------------------------------
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await User.findOne({ email });

    // Always the same response, whether or not the email exists — avoids
    // letting someone probe which emails are registered.
    if (user) {
      const rawToken = generateRawToken(32);
      user.passwordResetTokenHash = hashToken(rawToken);
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
      await user.save();

      const resetUrl = `${process.env.CLIENT_APP_URL}/reset-password?token=${rawToken}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: 'Validation failed', errors: err.flatten() });
    console.error(err);
    res.status(500).json({ message: 'Could not process request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) return res.status(400).json({ message: 'Password reset token is invalid or has expired' });

    user.passwordHash = await hashPassword(newPassword);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // A reset should kill any stolen sessions too.
    await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });

    res.json({ message: 'Password has been reset. Please log in again.' });
  } catch (err) {
    if (err instanceof ZodError) return res.status(400).json({ message: 'Validation failed', errors: err.flatten() });
    console.error(err);
    res.status(500).json({ message: 'Could not reset password' });
  }
};
