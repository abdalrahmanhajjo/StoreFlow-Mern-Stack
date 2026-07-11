import { create } from 'zustand';
import sessionsData from '@/data/sessions.json';
import blockedIpsData from '@/data/blockedIps.json';
import loginAttemptsData from '@/data/loginAttempts.json';
import auditLogData from '@/data/auditLog.json';
import { isConnected } from '@/lib/api/resources';

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
  blockedAt?: string;
  banCount: number;
}

export function banDuration(banCount: number): string {
  if (banCount <= 0) return '—';
  if (banCount === 1) return '1hr';
  if (banCount === 2) return '1 day';
  if (banCount === 3) return '2 days';
  return `${Math.pow(2, banCount - 2)} days`;
}
export interface Attempt {
  id: string;
  account: string;
  ip: string;
  when: string;
  result: 'Success' | 'Failed' | 'Blocked';
}

// Connected mode starts empty and hydrates real data from /api/security.
// Blocked IPs have no backend model yet, so the list starts (and stays) real:
// only what the admin blocks in this session.
const SESSIONS = isConnected ? [] : (sessionsData as Session[]);
const IPS = isConnected ? [] : (blockedIpsData as BlockedIp[]);
const ATTEMPTS = isConnected ? [] : (loginAttemptsData as Attempt[]);

let seq = 100;

interface SecurityState {
  sessions: Session[];
  blockedIps: BlockedIp[];
  attempts: Attempt[];
  hydrate: (data: { sessions?: Session[]; attempts?: Attempt[] }) => void;
  forceLogout: (id: string) => void;
  revokeAll: () => void;
  blockIp: (ip: string) => { ok: boolean; error?: string };
  unblockIp: (id: string) => void;
}

// SF-306: security & sessions. Connected mode hydrates sessions (active
// refresh tokens) and login attempts from the API.
export const useSecurity = create<SecurityState>((set, get) => ({
  sessions: SESSIONS,
  blockedIps: IPS,
  attempts: ATTEMPTS,
  hydrate: (data) =>
    set((s) => ({
      sessions: data.sessions ?? s.sessions,
      attempts: data.attempts ?? s.attempts,
    })),
  forceLogout: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
  revokeAll: () => set({ sessions: [] }),
  blockIp: (ip) => {
    const v = ip.trim();
    if (!v) return { ok: false, error: 'Enter an IP address' };
    if (get().blockedIps.some((b) => b.ip === v)) return { ok: false, error: 'Already blocked' };
    set((s) => ({ blockedIps: [...s.blockedIps, { id: 'ip' + ++seq, ip: v, reason: 'Manually blocked', blockedAt: 'just now', banCount: 1 }] }));
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
const AUDIT = isConnected ? [] : (auditLogData as AuditEntry[]);
interface AuditState {
  entries: AuditEntry[];
  hydrate: (entries: AuditEntry[]) => void;
}
export const useAudit = create<AuditState>((set) => ({
  entries: AUDIT,
  hydrate: (entries) => set({ entries }),
}));
