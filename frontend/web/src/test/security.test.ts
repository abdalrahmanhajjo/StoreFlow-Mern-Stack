import { describe, it, expect } from 'vitest';
import { useSecurity } from '@/features/admin/securityStore';

describe('security & sessions (SF-306)', () => {
  it('force logout removes a session', () => {
    const s = useSecurity.getState();
    const id = s.sessions[0].id;
    const before = s.sessions.length;
    s.forceLogout(id);
    expect(useSecurity.getState().sessions.length).toBe(before - 1);
  });

  it('blocks and unblocks IPs (no duplicates)', () => {
    const s = useSecurity.getState();
    const before = s.blockedIps.length;
    expect(s.blockIp('9.9.9.9').ok).toBe(true);
    expect(useSecurity.getState().blockedIps.length).toBe(before + 1);
    expect(useSecurity.getState().blockIp('9.9.9.9').ok).toBe(false); // duplicate
    const newIp = useSecurity.getState().blockedIps.find((b) => b.ip === '9.9.9.9')!;
    useSecurity.getState().unblockIp(newIp.id);
    expect(useSecurity.getState().blockedIps.some((b) => b.ip === '9.9.9.9')).toBe(false);
  });

  it('revoke all clears sessions', () => {
    useSecurity.getState().revokeAll();
    expect(useSecurity.getState().sessions.length).toBe(0);
  });
});
