import { useState, useMemo } from 'react';
import { usePlatformUsers, type PlatformUser } from './adminStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge, Button, confirmDialog, toast } from '@/components/ui';

export default function UsersPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { users, toggle, remove } = usePlatformUsers();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const activeCount = users.filter((u) => u.status === 'active').length;
  const disabledCount = users.filter((u) => u.status === 'disabled').length;
  const adminCount = users.filter((u) => u.role === 'Platform admin').length;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ = !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchQ && matchRole;
    });
  }, [users, q, roleFilter]);

  const onDelete = async (u: PlatformUser) => {
    if (u.root) return;
    if (await confirmDialog(`Delete ${u.name}? This removes their account permanently.`)) {
      remove(u.id);
      toast(`${u.name} deleted`);
    }
  };

  const onToggle = (u: PlatformUser) => {
    if (u.root) return;
    toggle(u.id);
    toast(`${u.name} ${u.status === 'active' ? 'disabled' : 'enabled'}`);
  };

  const stlInput: React.CSSProperties = {
    padding: isMobile ? '11px 14px' : '9px 14px',
    border: '1px solid var(--line)',
    borderRadius: 9,
    fontSize: isMobile ? 16 : 13,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    background: 'var(--card)',
    width: isMobile ? '100%' : undefined,
  };

  const roleColor = (r: string) =>
    r === 'Platform admin' ? '#8B5CF6' : r === 'Owner' ? '#D97706' : r === 'Manager' ? '#2563EB' : '#64748B';

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Platform</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>All users</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{users.length} accounts · {activeCount} active · across all stores</p>
        </div>
        <Button variant="ghost" onClick={() => toast('User list exported (CSV)')} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>⤓ Export</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Total users', value: users.length, color: 'var(--ink)' },
          { label: 'Active', value: activeCount, color: 'var(--green)' },
          { label: 'Disabled', value: disabledCount, color: 'var(--red)' },
          { label: 'Platform admins', value: adminCount, color: 'var(--purple)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + role filter */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" style={{ ...stlInput, flex: '1 1 160px', minWidth: 140 }} />
        <select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ ...stlInput, flex: '0 1 auto' }}>
          <option value="all">All roles</option>
          <option>Platform admin</option>
          <option>Owner</option>
          <option>Manager</option>
          <option>Cashier</option>
        </select>
      </div>

      <style>{`
        .sf-user-card { transition: box-shadow .2s, transform .2s; position: relative; }
        .sf-user-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-user-card-actions { opacity: 0; transition: opacity .15s; }
        .sf-user-card:hover .sf-user-card-actions,
        .sf-user-card:focus-within .sf-user-card-actions { opacity: 1; }
        @media (hover: none) { .sf-user-card-actions { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sf-user-card, .sf-user-card-actions { transition: none; }
          .sf-user-card:hover { transform: none; }
        }
      `}</style>

      {/* User cards */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 12 : 20 }}>
        {rows.length === 0 ? (
          <div style={{ padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No users match.</p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>Try adjusting your search or role filter.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {rows.map((u) => (
              <div key={u.id} className="sf-user-card" style={{ background: 'var(--card)', border: u.root ? '1.5px solid #8B5CF6' : '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: u.root ? '0 0 0 2px rgba(139,92,246,.12)' : 'var(--shadow)', position: 'relative' }}>
                <div style={{ padding: isMobile ? 14 : 16, paddingBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, marginBottom: 10 }}>
                    <div style={{ width: isMobile ? 38 : 40, height: isMobile ? 38 : 40, borderRadius: 10, background: roleColor(u.role), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 13 : 14, fontWeight: 800, flexShrink: 0 }}>
                      {u.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: isMobile ? 14 : 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div className="mono" style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>{u.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <Badge tone={u.role === 'Platform admin' ? 'blue' : u.role === 'Owner' ? 'amber' : 'grey'}>{u.role}</Badge>
                    <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge>
                  </div>

                  <div style={{ display: 'flex', gap: 6, fontSize: isMobile ? 12 : 11.5, color: 'var(--ink-faint)', marginBottom: 10 }}>
                    {u.store !== '—' && <span>{u.store}</span>}
                    <span className="mono">{u.lastActive}</span>
                  </div>
                </div>

                {u.root ? (
                  <div style={{ borderTop: '1px solid var(--line-soft)', background: 'rgba(139,92,246,.06)', padding: isMobile ? '10px 14px' : '8px 14px', marginTop: 8, fontSize: isMobile ? 12 : 11.5, color: '#7C3AED', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Protected root admin
                  </div>
                ) : (
                  <div className="sf-user-card-actions" style={{ display: 'flex', gap: 2, borderTop: '1px solid var(--line-soft)', background: 'var(--paper)', padding: isMobile ? '8px 10px' : '6px 8px', marginTop: 8 }}>
                    <button type="button" onClick={() => toast(`Reset link sent to ${u.name}`)}
                      style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 12.5 : 11.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                      Reset
                    </button>

                    <div style={{ width: 1, background: 'var(--line-soft)' }} />

                    <button type="button" onClick={() => onToggle(u)}
                      style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 12.5 : 11.5, fontWeight: 600, color: u.status === 'active' ? 'var(--red)' : 'var(--green)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {u.status === 'active' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                      {u.status === 'active' ? 'Disable' : 'Enable'}
                    </button>

                    <div style={{ width: 1, background: 'var(--line-soft)' }} />

                    <button type="button" onClick={() => onDelete(u)}
                      style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 12.5 : 11.5, fontWeight: 600, color: 'var(--red)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'inherit' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--red-soft)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
