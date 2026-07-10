import { NavLink, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useSession } from '@/store/session';
import { navForRole } from '@/app/navConfig';
import { useApprovals } from '@/features/admin/adminStore';
import { Logo } from '@/components/ui';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useSession((s) => s.user);
  const location = useLocation();
  const pendingApprovals = useApprovals((s) => s.applications.length);
  const items = useMemo(() => (user ? navForRole(user.role) : []), [user]);
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);

  return (
    <>
      <style>{`
        .sf-sidebar { scrollbar-width: thin; scrollbar-color: transparent transparent; transition: scrollbar-color .3s; }
        .sf-sidebar:hover { scrollbar-color: var(--shell-line) transparent; }
        .sf-sidebar::-webkit-scrollbar { width: 4px; }
        .sf-sidebar::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
        .sf-sidebar:hover::-webkit-scrollbar-thumb { background: var(--shell-line); }
        .sf-nav-item { position: relative; transition: background .15s, color .15s; }
        .sf-nav-item::before {
          content: ''; position: absolute; left: -14px; top: 6px; bottom: 6px; width: 3px;
          border-radius: 0 3px 3px 0; background: var(--shell-text); transform: scaleX(0);
          transition: transform .2s ease;
        }
        .sf-nav-item.active::before { transform: scaleX(1); }
        .sf-nav-item:hover { background: var(--shell-raise); }
        .sf-nav-item.active:hover { background: var(--shell-raise); }
      `}</style>
      <aside style={{
        width: 244, flexShrink: 0, background: 'var(--shell)',
        borderRight: '1px solid var(--shell-line)', padding: '20px 14px 16px',
        display: 'flex', flexDirection: 'column', height: '100vh',
        position: 'sticky', top: 0, overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '2px 6px 20px' }}>
          <Logo size={34} />
          <span className="display" style={{
            fontWeight: 700, fontSize: 15, color: 'var(--shell-text)',
            textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: 1.25,
          }}>StoreFlow</span>
        </div>
        <nav className="sf-sidebar" style={{ overflowY: 'auto', flex: 1, marginRight: -8, paddingRight: 8 }}>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
                color: 'var(--shell-muted)', padding: '14px 10px 5px', fontWeight: 600,
              }}>{g}</div>
              {items.filter((i) => i.group === g).map((i) => (
                <NavLink
                  key={i.path}
                  to={i.path}
                  onClick={onNavigate}
                  className={({ isActive }) => `sf-nav-item${isActive ? ' active' : ''}`}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '9px 11px', borderRadius: 9, fontSize: 13.5,
                    marginBottom: 1, fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--shell-text)' : 'var(--shell-muted)',
                    background: isActive ? 'var(--shell-raise)' : 'transparent',
                  })}
                  aria-current={location.pathname === i.path ? 'page' : undefined}
                >
                  <span style={{ flex: 1 }}>{i.label}</span>
                  {i.path === '/admin/approvals' && pendingApprovals > 0 && (
                    <span style={{
                      background: 'var(--shell-text)', color: 'var(--shell)', fontSize: 10, fontWeight: 700,
                      minWidth: 18, height: 18, borderRadius: 9, display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', padding: '0 5px',
                    }}>{pendingApprovals}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div style={{
          borderTop: '1px solid var(--shell-line)', paddingTop: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'transparent',
            border: '1px solid var(--shell-line)',
            color: 'var(--shell-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 600, fontSize: 12, flexShrink: 0,
          }}>
            {user?.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ fontSize: 12.5, lineHeight: 1.35, minWidth: 0 }}>
            <div style={{ color: 'var(--shell-text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ color: 'var(--shell-muted)', textTransform: 'capitalize' }}>{user?.role.replace('_', ' ')}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
