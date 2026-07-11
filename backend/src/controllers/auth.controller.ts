import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { randomInt } from 'crypto';

import { User } from '../models/user.model';
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
  sendEmailVerificationCode,
} from '../utils/auth.utils';

import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailCodeSchema,
  resendVerificationCodeSchema,
} from '../validators/auth.validator';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MINUTES = 15;

const RESET_TOKEN_TTL_MINUTES = 30;

const EMAIL_VERIFICATION_CODE_TTL_MINUTES = 10;

const cookieOptions = (expires?: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  expires,
});

const generateEmailVerificationCode = () => {
  return randomInt(100000, 1000000).toString();
};

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

    if (existing) {
      return res.status(409).json({
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await hashPassword(input.password);

    // Create owner with phone and ID verification
    const owner = await User.create({
      name: input.ownerName,
      email: input.email,
      passwordHash,
      role: 'owner',
      storeId: null,
      isEmailVerified: false,
      phone: {
        countryCode: input.phone.countryCode,
        number: input.phone.number,
      },
      idVerification: {
        type: input.idVerification.type,
        number: input.idVerification.number,
      },
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

      const verificationCode = generateEmailVerificationCode();

      owner.storeId = store._id;
      owner.isEmailVerified = false;
      owner.emailVerificationCodeHash = hashToken(verificationCode);
      owner.emailVerificationCodeExpires = new Date(
        Date.now() + EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000
      );

      await owner.save();

      await sendEmailVerificationCode(owner.email, verificationCode);

      res.status(201).json({
        message:
          'Store registered. Verification code sent to your email. Please verify your email before logging in.',
        data: {
          userId: owner._id,
          storeId: store._id,
          email: owner.email,
          isEmailVerified: owner.isEmailVerified,
        },
      });
    } catch (storeErr) {
      await Store.deleteOne({ ownerId: owner._id });
      await User.deleteOne({ _id: owner._id });
      throw storeErr;
    }
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.flatten(),
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Registration failed',
    });
  }
};

// ---------------------------------------------------------------------------
// Email verification using 6-digit code
// ---------------------------------------------------------------------------
export const verifyEmailCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = verifyEmailCodeSchema.parse(req.body);

    const user = await User.findOne({ email }).select(
      '+emailVerificationCodeHash +emailVerificationCodeExpires'
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Email is already verified',
      });
    }

    if (
      !user.emailVerificationCodeHash ||
      !user.emailVerificationCodeExpires ||
      user.emailVerificationCodeExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        message: 'Verification code expired. Please request a new code.',
      });
    }

    const submittedCodeHash = hashToken(code);

    if (submittedCodeHash !== user.emailVerificationCodeHash) {
      return res.status(400).json({
        message: 'Invalid verification code',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationCodeHash = null;
    user.emailVerificationCodeExpires = null;

    await user.save();

    res.status(200).json({
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.flatten(),
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Could not verify email',
    });
  }
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = resendVerificationCodeSchema.parse(req.body);

    const user = await User.findOne({ email }).select(
      '+emailVerificationCodeHash +emailVerificationCodeExpires'
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: 'Email is already verified',
      });
    }

    const verificationCode = generateEmailVerificationCode();

    user.emailVerificationCodeHash = hashToken(verificationCode);
    user.emailVerificationCodeExpires = new Date(
      Date.now() + EMAIL_VERIFICATION_CODE_TTL_MINUTES * 60 * 1000
    );

    await user.save();

    await sendEmailVerificationCode(user.email, verificationCode);

    res.status(200).json({
      message: 'New verification code sent to your email.',
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.flatten(),
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Could not resend verification code',
    });
  }
};

// ---------------------------------------------------------------------------
// BS-202 — Login (lockout after N fails, rotating refresh token)
// ---------------------------------------------------------------------------
export const login = async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);
    const ip = req.ip ?? 'unknown';

    const user = await User.findOne({ email: input.email }).select(
      '+passwordHash'
    );

    const invalidCreds = () =>
      res.status(401).json({
        message: 'Invalid email or password',
      });

    if (!user) {
      await LoginAttempt.create({
        email: input.email,
        ip,
        success: false,
      });

      return invalidCreds();
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      await LoginAttempt.create({
        email: input.email,
        ip,
        success: false,
      });

      const minutesLeft = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000
      );

      return res.status(423).json({
        message: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const passwordOk = await comparePassword(input.password, user.passwordHash);

    if (!passwordOk) {
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;

      if (user.failedLoginAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.lockUntil = new Date(
          Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000
        );
        user.failedLoginAttempts = 0;
      }

      await user.save();

      await LoginAttempt.create({
        email: input.email,
        ip,
        success: false,
      });

      return invalidCreds();
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        code: 'EMAIL_UNVERIFIED',
        message: 'Please verify your email before logging in.',
      });
    }

    const store = user.storeId ? await Store.findById(user.storeId) : null;

    // Store owners/staff can't sign in until a platform admin approves the
    // store. Blocked sign-ins still land in the login-attempt log.
    if (store && store.status !== 'active') {
      await LoginAttempt.create({
        email: input.email,
        ip,
        success: false,
      });

      if (store.status === 'pending') {
        return res.status(403).json({
          code: 'PENDING_APPROVAL',
          message:
            "Your account is still under review. We'll notify you once approved.",
        });
      }

      return res.status(403).json({
        code: 'STORE_SUSPENDED',
        message: 'This store is suspended. Contact support for help.',
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    await LoginAttempt.create({
      email: input.email,
      ip,
      success: true,
    });

    const { accessToken, rawRefreshToken, refreshTokenExpiresAt } =
      await issueTokens(user);

    res.cookie(REFRESH_COOKIE, rawRefreshToken, cookieOptions(refreshTokenExpiresAt));

    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        businessType: store?.businessType ?? null,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.flatten(),
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Login failed',
    });
  }
};

// ---------------------------------------------------------------------------
// BS-203 — Refresh / Logout / Me
// ---------------------------------------------------------------------------
export const refresh = async (req: Request, res: Response) => {
  try {
    const incoming = req.cookies?.[REFRESH_COOKIE];

    if (!incoming) {
      return res.status(401).json({
        message: 'No refresh token provided',
      });
    }

    const tokenHash = hashToken(incoming);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored) {
      return res.status(401).json({
        message: 'Invalid refresh token',
      });
    }

    if (stored.revokedAt) {
      await RefreshToken.updateMany(
        {
          userId: stored.userId,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        }
      );

      return res.status(401).json({
        message: 'Refresh token reuse detected — all sessions revoked',
      });
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({
        message: 'Refresh token expired',
      });
    }

    const user = await User.findById(stored.userId);

    if (!user) {
      return res.status(401).json({
        message: 'Account no longer available',
      });
    }

    const { accessToken, rawRefreshToken, refreshTokenExpiresAt } =
      await issueTokens(user);

    stored.revokedAt = new Date();
    await stored.save();

    res.cookie(REFRESH_COOKIE, rawRefreshToken, cookieOptions(refreshTokenExpiresAt));

    res.json({
      accessToken,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: 'Could not refresh session',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  const incoming = req.cookies?.[REFRESH_COOKIE];

  if (incoming) {
    await RefreshToken.updateOne(
      {
        tokenHash: hashToken(incoming),
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );
  }

  res.clearCookie(REFRESH_COOKIE, {
    path: '/api/auth',
  });

  res.status(204).send();
};

export const me = async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub);

  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  const store = user.storeId ? await Store.findById(user.storeId) : null;

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
    businessType: store?.businessType ?? null,
    isEmailVerified: user.isEmailVerified,
  });
};

// ---------------------------------------------------------------------------
// Approval status — polled by the registration pending screen (public).
// Step mirrors the review pipeline: 0=submitted, 1=identity, 2=business,
// 3=activated, 4=approved.
// ---------------------------------------------------------------------------
export const approvalStatus = async (req: Request, res: Response) => {
  const email = String(req.query.email ?? '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'email query param is required' });
  }

  const user = await User.findOne({ email });
  const store = user?.storeId ? await Store.findById(user.storeId) : null;

  // Unknown emails read as approved so the endpoint can't be used to
  // enumerate which addresses have an account.
  if (!user || !store) {
    return res.json({ status: 'approved', name: '', step: 4 });
  }

  if (store.status === 'suspended') {
    return res.json({ status: 'rejected', name: user.name, step: 0 });
  }

  if (store.status === 'active') {
    return res.json({ status: 'approved', name: user.name, step: 4 });
  }

  // Pending: email verification is the first concrete milestone we can show.
  return res.json({
    status: 'pending',
    name: user.name,
    step: user.isEmailVerified ? 2 : 1,
  });
};

// ---------------------------------------------------------------------------
// BS-204 — Password reset via time-limited emailed token
// ---------------------------------------------------------------------------
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });

    if (user) {
      const rawToken = generateRawToken(32);

      user.passwordResetTokenHash = hashToken(rawToken);
      user.passwordResetExpires = new Date(
        Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000
      );

      await user.save();

      const resetUrl = `${process.env.CLIENT_APP_URL}/reset-password?token=${rawToken}`;

      await sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({
      message: 'If that email exists, a reset link has been sent.',
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.flatten(),
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Could not process request',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: {
        $gt: new Date(),
      },
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        message: 'Password reset token is invalid or has expired',
      });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    await RefreshToken.updateMany(
      {
        userId: user._id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );

    res.json({
      message: 'Password has been reset. Please log in again.',
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: err.flatten(),
      });
    }

    console.error(err);

    res.status(500).json({
      message: 'Could not reset password',
    });
  }
};