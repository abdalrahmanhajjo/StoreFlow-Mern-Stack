import { useNavigate } from 'react-router-dom';
import { useSession } from '@/store/session';
import { authService } from '@/features/auth/authService';
import { Button } from '@/components/ui';

export function Topbar({ title, onMenu, showMenu, isOpen }: { title: string; onMenu: () => void; showMenu: boolean; isOpen?: boolean }) {
  const clear = useSession((s) => s.clear);
  const navigate = useNavigate();

  const logout = async () => {
    await authService.logout();
    clear();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <style>{`
        @keyframes sf-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .sf-topbar { animation: sf-slide-down .25s ease-out; }
        .sf-hamburger { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 3px; width: 18px; height: 18px; }
        .sf-hamburger span { display: block; width: 18px; height: 2px; background: var(--ink-soft); border-radius: 2px; transition: transform .25s ease, opacity .25s ease; transform-origin: center; }
        .sf-hamburger.open span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
        .sf-hamburger.open span:nth-child(2) { opacity: 0; }
        .sf-hamburger.open span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }
        @media (prefers-reduced-motion: reduce) {
          .sf-topbar, .sf-hamburger span { animation: none; transition: none; }
        }
      `}</style>
      <header className="sf-topbar" style={{
        height: 62, background: 'rgba(255,255,255,.82)',
        backdropFilter: 'saturate(1.4) blur(10px)',
        WebkitBackdropFilter: 'saturate(1.4) blur(10px)',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px 0 20px', position: 'sticky', top: 0, zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          {showMenu && (
            <button
              type="button"
              onClick={onMenu}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              style={{
                background: 'none', border: '1px solid var(--line)', borderRadius: 9,
                width: 36, height: 36, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background .15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-dim)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className={`sf-hamburger${isOpen ? ' open' : ''}`} aria-hidden>
                <span /><span /><span />
              </div>
            </button>
          )}
          <div className="display" style={{
            fontSize: 18, fontWeight: 700, color: 'var(--ink)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>{title}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} style={{ flexShrink: 0 }}>Log out</Button>
      </header>
    </>
  );
}
