import { useState, useEffect, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from './authService';
import { Button, Input, Logo } from '@/components/ui';

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--paper)', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 440, background: 'var(--card)', borderRadius: 20,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 2px 8px -4px rgba(0,0,0,0.05)',
    padding: '40px 44px', animation: 'sf-scale-in .35s ease-out',
  } as CSSProperties,
};

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', manager: 'Manager', cashier: 'Cashier' };

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ name: string; email: string; role: string; storeName: string | null } | null>(null);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setLoadError('This invite link is missing its token.'); setLoading(false); return; }
    authService.getInviteInfo(token)
      .then((info) => { setInvite(info); setName(info.name ?? ''); })
      .catch((e) => setLoadError((e as Error)?.message || 'This invite is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let bad = false;
    if (password.length < 8) { setPwError('At least 8 characters'); bad = true; }
    else if (!/[a-z]/.test(password)) { setPwError('Include a lowercase letter'); bad = true; }
    else if (!/[A-Z]/.test(password)) { setPwError('Include an uppercase letter'); bad = true; }
    else if (!/\d/.test(password)) { setPwError('Include a number'); bad = true; }
    else setPwError('');
    if (password !== confirm) { setConfirmError('Passwords do not match'); bad = true; } else setConfirmError('');
    if (bad) return;

    setBusy(true);
    setServerError('');
    try {
      await authService.acceptInvite(token, password, name.trim() || undefined);
      setDone(true);
    } catch (ex) {
      setServerError((ex as Error)?.message || 'This invite is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes sf-scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { #sf-card { animation: none; } }
      `}</style>

      <div style={s.page}>
        <div id="sf-card" style={s.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
              <Logo size={34} />
              <span className="display" style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>StoreFlow</span>
            </div>
          </div>

          {loading && <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14 }}>Loading your invite…</p>}

          {!loading && loadError && (
            <div>
              <h2 className="display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>Invite unavailable</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{loadError}</p>
              <Button type="button" fullWidth onClick={() => navigate('/login')}>Go to sign in</Button>
            </div>
          )}

          {!loading && !loadError && invite && !done && (
            <div>
              <h2 className="display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>Set up your account</h2>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                You've been invited to join{' '}
                <strong style={{ color: 'var(--ink)' }}>{invite.storeName ?? 'the store'}</strong>{' '}
                as a <strong style={{ color: 'var(--ink)' }}>{ROLE_LABEL[invite.role] ?? invite.role}</strong>.
                Choose a password to finish — you'll sign in with{' '}
                <strong style={{ color: 'var(--ink)' }}>{invite.email}</strong>.
              </p>
              <form onSubmit={submit}>
                <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={pwError} placeholder="At least 8 characters" />
                <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={confirmError} placeholder="Repeat your password" />
                {serverError && <p role="alert" style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 12px' }}>{serverError}</p>}
                <Button type="submit" fullWidth isLoading={busy}>Create account</Button>
              </form>
            </div>
          )}

          {done && (
            <div>
              <h2 className="display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>You're all set</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                Your account is ready. Sign in with your email and the password you just chose.
              </p>
              <Button type="button" fullWidth onClick={() => navigate('/login')}>Sign in</Button>
              <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
                <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
