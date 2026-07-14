import { Request, Response } from 'express';
import mongoose from 'mongoose';

/**
 * Mongo filter fragment for the requester's tenant. Platform admins
 * (req.storeId === null) see across stores; everyone else is confined to
 * their own. Spread it into every workspace query:
 *
 *   Product.find({ ...tenantFilter(req), isActive: true })
 */
export const tenantFilter = (req: Request, field = 'storeId'): Record<string, unknown> =>
  req.storeId ? { [field]: req.storeId } : {};

/**
 * Like tenantFilter, but with an explicit ObjectId cast — aggregation
 * pipelines ($match) don't auto-cast strings the way find() does.
 */
export const tenantMatch = (req: Request, field = 'storeId'): Record<string, unknown> =>
  req.storeId
    ? { [field]: new mongoose.Types.ObjectId(String(req.storeId)) }
    : {};

/**
 * Guard for create paths: documents must always belong to a store. Returns
 * the storeId, or responds 403 and returns null (caller should return).
 */
export const requireStoreId = (req: Request, res: Response): string | null => {
  if (!req.storeId) {
    res.status(403).json({
      success: false,
      message: 'A store-scoped account is required for this action',
    });
    return null;
  }
  return req.storeId.toString();
};
