import { Request, Response } from 'express';
import { LoginAttempt } from '../models/login_attempt.model';
import { RefreshToken } from '../models/refresh_token.model';

// Platform security views (admin-only, mounted behind authorize in the router).

export const getLoginAttempts = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const attempts = await LoginAttempt.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, count: attempts.length, data: attempts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not load login attempts' });
  }
};

/** Active sessions = refresh tokens that are neither revoked nor expired. */
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const sessions = await RefreshToken.find({
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name email role');

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not load sessions' });
  }
};
