import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { authService } from './authService';
import { Button, Input, Logo } from '@/components/ui';

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--paper)',
    padding: 24,
  },
  card: {
    width: '100%', maxWidth: 420,
    background: 'var(--card)', borderRadius: 20,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 2px 8px -4px rgba(0,0,0,0.05)',
    padding: '40px 44px',
    animation: 'sf-scale-in .35s ease-out',
  } as CSSProperties,
};

// SF-104: same response whether or not the email exists — no account
// enumeration (forgotPassword() in auth.controller.ts always returns 200).
export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setBusy(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes sf-scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes sf-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .sf-enter { animation: sf-slide-up .35s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          #sf-card { animation: none; }
          .sf-enter { animation: none; }
        }
      `}</style>

      <div style={s.page}>
        <div id="sf-card" style={s.card}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
              <Logo size={34} />
              <span className="display" style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>StoreFlow</span>
            </div>
          </div>

          {!sent ? (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Reset password</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)' }}>Enter your email and we&apos;ll send you a reset link.</p>
              <form onSubmit={handleSendLink}>
                <Input
                  label="Email address" type="email" placeholder="you@store.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus
                  leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
                />
                <Button type="submit" fullWidth isLoading={busy}>Send reset link</Button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-faint)' }}>
                <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </div>
          ) : (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Check your email</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                If an account exists for <strong style={{ color: 'var(--ink)' }}>{email}</strong>, a reset link
                is on its way. It expires in 30 minutes.
              </p>
              <Button type="button" fullWidth variant="ghost" onClick={() => setSent(false)}>
                Use a different email
              </Button>
              <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-faint)' }}>
                <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}