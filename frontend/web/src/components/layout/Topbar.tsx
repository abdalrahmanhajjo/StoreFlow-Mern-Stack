import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/store/session';
import { authService } from '@/features/auth/authService';
import { getTheme, setTheme, type Theme } from '@/lib/theme';
import { Button } from '@/components/ui';

export function Topbar({ title, onMenu, showMenu, isOpen }: { title: string; onMenu: () => void; showMenu: boolean; isOpen?: boolean }) {
  const clear = useSession((s) => s.clear);
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<Theme>(getTheme);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

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
        height: 62, background: 'var(--topbar-glass)',
        backdropFilter: 'saturate(1.1) blur(10px)',
        WebkitBackdropFilter: 'saturate(1.1) blur(10px)',
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
            fontSize: 19, fontWeight: 800, color: 'var(--ink)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>{title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="eyebrow"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              border: '1px solid var(--line)', background: 'var(--card)',
              color: 'var(--ink-soft)', borderRadius: 10, padding: '8px 12px',
              fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background .15s, border-color .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          >
            <span aria-hidden style={{
              width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
              border: '1px solid var(--ink-soft)',
              background: theme === 'dark'
                ? 'var(--ink-soft)'
                : 'linear-gradient(90deg, var(--ink-soft) 50%, transparent 50%)',
              transition: 'background .2s',
            }} />
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
        </div>
      </header>
    </>
  );
}
