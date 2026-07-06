import { create } from 'zustand';
import sessionsData from '@/data/sessions.json';
import blockedIpsData from '@/data/blockedIps.json';
import loginAttemptsData from '@/data/loginAttempts.json';
import auditLogData from '@/data/auditLog.json';

export interface Session {
  id: string;
  user: string;
  ip: string;
  device: string;
  started: string;
}
export interface BlockedIp {
  id: string;
  ip: string;
  reason: string;
}
export interface Attempt {
  id: string;
  account: string;
  ip: string;
  when: string;
  result: 'Success' | 'Failed' | 'Blocked';
}

const SESSIONS = sessionsData as Session[];
const IPS = blockedIpsData as BlockedIp[];
const ATTEMPTS = loginAttemptsData as Attempt[];

let seq = 100;

interface SecurityState {
  sessions: Session[];
  blockedIps: BlockedIp[];
  attempts: Attempt[];
  forceLogout: (id: string) => void;
  revokeAll: () => void;
  blockIp: (ip: string) => { ok: boolean; error?: string };
  unblockIp: (id: string) => void;
}

// SF-306: security & sessions (client-only).
export const useSecurity = create<SecurityState>((set, get) => ({
  sessions: SESSIONS,
  blockedIps: IPS,
  attempts: ATTEMPTS,
  forceLogout: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
  revokeAll: () => set({ sessions: [] }),
  blockIp: (ip) => {
    const v = ip.trim();
    if (!v) return { ok: false, error: 'Enter an IP address' };
    if (get().blockedIps.some((b) => b.ip === v)) return { ok: false, error: 'Already blocked' };
    set((s) => ({ blockedIps: [...s.blockedIps, { id: 'ip' + ++seq, ip: v, reason: 'Manually blocked' }] }));
    return { ok: true };
  },
  unblockIp: (id) => set((s) => ({ blockedIps: s.blockedIps.filter((b) => b.id !== id) })),
}));

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  target: string;
  ip: string;
  kind: 'store' | 'user' | 'auth' | 'billing';
}
const AUDIT = auditLogData as AuditEntry[];
interface AuditState {
  entries: AuditEntry[];
}
export const useAudit = create<AuditState>(() => ({ entries: AUDIT }));
