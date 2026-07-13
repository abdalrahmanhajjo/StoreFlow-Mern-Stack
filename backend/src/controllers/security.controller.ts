import { Request, Response } from 'express';
import { LoginAttempt } from '../models/login_attempt.model';
import { RefreshToken } from '../models/refresh_token.model';

// Platform security views/actions admin-only, mounted behind authorize in router.

export const getLoginAttempts = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const attempts = await LoginAttempt.find()
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Could not load login attempts',
    });
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

    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Could not load sessions',
    });
  }
};

/** Admin action: revoke one active session. */
export const revokeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await RefreshToken.findOneAndUpdate(
      {
        _id: id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      },
      {
        new: true,
      }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or already revoked',
      });
    }

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Could not revoke session',
    });
  }
};

/** Admin action: revoke all active sessions. */
export const revokeAllSessions = async (req: Request, res: Response) => {
  try {
    const result = await RefreshToken.updateMany(
      {
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      message: 'All active sessions revoked',
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Could not revoke all sessions',
    });
  }
};