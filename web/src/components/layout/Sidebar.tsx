import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import { useSession } from '@/store/session';
import { navForRole } from '@/app/navConfig';
import { useApprovals } from '@/features/admin/adminStore';
import { Logo } from '@/components/ui';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useSession((s) => s.user);
  const pendingApprovals = useApprovals((s) => s.applications.length);
  const items = useMemo(() => (user ? navForRole(user.role) : []), [user]);
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);

  return (
    <aside style={{ width: 244, flexShrink: 0, background: 'var(--card)', borderRight: '1px solid var(--line)', padding: '20px 14px 16px', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '2px 6px 20px' }}>
        <Logo size={34} />
        <span className="display" style={{ fontWeight: 700, fontSize: 19, color: 'var(--ink)' }}>StoreFlow</span>
      </div>
      <nav style={{ overflowY: 'auto', flex: 1 }}>
        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink-faint)', padding: '13px 10px 5px', fontWeight: 600 }}>{g}</div>
            {items.filter((i) => i.group === g).map((i) => (
              <NavLink
                key={i.path}
                to={i.path}
                onClick={onNavigate}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 9,
                  fontSize: 13.5, marginBottom: 1, fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--blue-deep)' : 'var(--ink-soft)',
                  background: isActive ? 'var(--blue-soft)' : 'transparent',
                })}
              >
                <span style={{ flex: 1 }}>{i.label}</span>
                {i.path === '/admin/approvals' && pendingApprovals > 0 && (
                  <span style={{ background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 18, height: 18, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{pendingApprovals}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>
          {user?.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
          <div style={{ color: 'var(--ink)', fontWeight: 600 }}>{user?.name}</div>
          <div style={{ color: 'var(--ink-faint)', textTransform: 'capitalize' }}>{user?.role.replace('_', ' ')}</div>
        </div>
      </div>
    </aside>
  );
}
