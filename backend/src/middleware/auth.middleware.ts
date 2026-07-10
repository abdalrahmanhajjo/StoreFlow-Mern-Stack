import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../utils/auth.utils';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Verifies the access token JWT and attaches { sub, storeId, role } to req.user.
// Role/tenant guards on top of this (authorize(), storeId scoping) are a
// separate task — this just answers "is the caller logged in".
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) return res.status(401).json({ message: 'Authentication required' });

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired access token' });
  }
};
