import { describe, it, expect } from 'vitest';
import { useTenants, useApprovals, usePlatformUsers } from '@/features/admin/adminStore';

describe('tenants (SF-302)', () => {
  it('toggles suspend/activate', () => {
    const t = useTenants.getState().tenants.find((x) => x.status === 'active')!;
    useTenants.getState().toggleSuspend(t.id);
    expect(useTenants.getState().tenants.find((x) => x.id === t.id)!.status).toBe('suspended');
    useTenants.getState().toggleSuspend(t.id);
    expect(useTenants.getState().tenants.find((x) => x.id === t.id)!.status).toBe('active');
  });

  it('deletes a tenant', () => {
    const before = useTenants.getState().tenants.length;
    useTenants.getState().remove(useTenants.getState().tenants[0].id);
    expect(useTenants.getState().tenants.length).toBe(before - 1);
  });
});

describe('approvals (SF-303)', () => {
  it('approve/reject remove from the queue', () => {
    const before = useApprovals.getState().applications.length;
    const first = useApprovals.getState().applications[0].id;
    useApprovals.getState().approve(first);
    expect(useApprovals.getState().applications.length).toBe(before - 1);
    const next = useApprovals.getState().applications[0].id;
    useApprovals.getState().reject(next);
    expect(useApprovals.getState().applications.length).toBe(before - 2);
  });
});

describe('platform users (SF-304)', () => {
  it('disable/enable and delete', () => {
    const u = usePlatformUsers.getState().users.find((x) => !x.root && x.status === 'active')!;
    usePlatformUsers.getState().toggle(u.id);
    expect(usePlatformUsers.getState().users.find((x) => x.id === u.id)!.status).toBe('disabled');
    const before = usePlatformUsers.getState().users.length;
    usePlatformUsers.getState().remove(u.id);
    expect(usePlatformUsers.getState().users.length).toBe(before - 1);
  });
});
