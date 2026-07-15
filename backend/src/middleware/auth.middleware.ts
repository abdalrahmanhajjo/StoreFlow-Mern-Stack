import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/auth.utils';
import { User } from '../models/user.model';
import { Store } from '../models/store.model';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Verifies the access token JWT AND checks the user account is still active
// (not deleted, not suspended). Also checks the owning store is not suspended
// for store-scoped accounts. This runs on every authenticated request so a
// deactivated account or suspended store cannot use a still-valid JWT.
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) return res.status(401).json({ message: 'Authentication required' });

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }

  // Liveness checks in parallel (they're independent): the user still exists
  // and is active; for store-scoped accounts, the store isn't suspended.
  const [user, store] = await Promise.all([
    User.findById(payload.sub).select('isActive').lean(),
    payload.storeId
      ? Store.findById(payload.storeId).select('status').lean()
      : Promise.resolve(null),
  ]);

  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Account is disabled or deleted' });
  }
  if (payload.storeId && (!store || store.status === 'suspended')) {
    return res.status(403).json({ message: 'Store access is suspended' });
  }

  req.user = payload;
  next();
};
