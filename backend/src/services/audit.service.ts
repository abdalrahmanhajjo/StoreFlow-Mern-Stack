import { Types, ClientSession } from 'mongoose';
import AuditLog, { AuditAction } from '../models/audit_log.model';

export type AuditLogInput = {
  actor: Types.ObjectId | string;
  store: Types.ObjectId | string;
  action: AuditAction;
  resourceType: string;
  resourcePublicId?: string;
  result?: 'success' | 'failure' | 'denied';
  reasonCode?: string;
  description?: string;
  performedByName?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
};

export function createAuditLog(input: AuditLogInput, session?: ClientSession) {
  const options = session ? { session } : {};
  return AuditLog.create([{
    actor: input.actor,
    store: input.store,
    action: input.action,
    resourceType: input.resourceType,
    resourcePublicId: input.resourcePublicId,
    result: input.result ?? 'success',
    reasonCode: input.reasonCode,
    description: input.description,
    performedByName: input.performedByName,
    metadata: input.metadata,
    ip: input.ip,
  }], options);
}

export function logMutation(
  req: { user?: { sub?: string; role?: string }; storeId?: string | null; ip?: string },
  action: AuditAction,
  resourceType: string,
  resourcePublicId?: string,
  extra?: Partial<AuditLogInput>,
): Promise<void> {
  if (!req.user?.sub || !req.storeId) return Promise.resolve();
  createAuditLog({
    actor: req.user.sub,
    store: req.storeId,
    action,
    resourceType,
    resourcePublicId,
    ...extra,
  }).catch(() => {});
  return Promise.resolve();
}
