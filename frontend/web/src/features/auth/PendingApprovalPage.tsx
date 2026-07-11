import { type CSSProperties } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button, Logo } from '@/components/ui';

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--paper)',
    padding: 24,
  },
  card: {
    width: '100%', maxWidth: 460,
    background: 'var(--card)', borderRadius: 20,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 2px 8px -4px rgba(0,0,0,0.05)',
    padding: '44px 48px',
    animation: 'sf-scale-in .5s ease-out',
  } as CSSProperties,
};

// There's no backend endpoint to poll store-approval status, and login()
// doesn't currently block on Store.status anyway — only on isEmailVerified.
// So this is just an informational page for anyone who lands here (e.g. an
// old link), not an active gate in the sign-up flow anymore.
export default function PendingApprovalPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email');

  return (
    <>
      <style>{`
        @keyframes sf-scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes sf-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .8; } }
        .sf-pulse { animation: sf-pulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          #sf-card, .sf-pulse { animation: none; }
        }
      `}</style>

      <div style={s.page}>
        <div id="sf-card" style={s.card}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
              <Logo size={32} />
              <span className="display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>StoreFlow</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--blue-soft)',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#131312" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sf-pulse">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
          </div>

          <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px', textAlign: 'center' }}>
            Application submitted
          </h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center', margin: '0 0 20px' }}>
            {email ? `We're reviewing ${email}` : "We're reviewing your application"}
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 28px' }}>
            Once you've verified your email you can sign in right away. Our team also reviews new stores
            in the background — you'll be notified if anything on your account needs attention.
          </p>

          <Button type="button" fullWidth onClick={() => navigate('/login')} style={{ letterSpacing: '0.01em' }}>
            Go to sign in
          </Button>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-faint)' }}>
            <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}