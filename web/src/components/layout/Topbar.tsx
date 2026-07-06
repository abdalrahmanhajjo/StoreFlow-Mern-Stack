import { useNavigate } from 'react-router-dom';
import { useSession } from '@/store/session';
import { authService } from '@/features/auth/authService';
import { Button } from '@/components/ui';

export function Topbar({ title, onMenu, showMenu }: { title: string; onMenu: () => void; showMenu: boolean }) {
  const clear = useSession((s) => s.clear);
  const navigate = useNavigate();

  const logout = async () => {
    await authService.logout(); // clears the HttpOnly refresh cookie server-side
    clear();
    navigate('/login', { replace: true });
  };

  return (
    <header style={{ height: 62, background: 'rgba(255,255,255,.82)', backdropFilter: 'saturate(1.4) blur(10px)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showMenu && (
          <button type="button" onClick={onMenu} aria-label="Open menu" style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 9, width: 36, height: 36, cursor: 'pointer' }}>☰</button>
        )}
        <div className="display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{title}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
    </header>
  );
}
