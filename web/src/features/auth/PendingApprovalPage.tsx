import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authService } from './authService';
import { Button, Logo } from '@/components/ui';

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0f5ff 0%, #f7f9fc 50%, #eef2f8 100%)',
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

type Phase = 'pending' | 'approved' | 'rejected';

const PIPELINE = [
  { key: 'submitted', label: 'Registration submitted', desc: 'Application received' },
  { key: 'identity', label: 'Identity verification', desc: 'Checking provided documents' },
  { key: 'business', label: 'Business validation', desc: 'Verifying business details' },
  { key: 'activated', label: 'Account activated', desc: 'Ready for sign in' },
] as const;

export default function PendingApprovalPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const email = params.get('email') || 'your email';
  const [phase, setPhase] = useState<Phase>('pending');
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const checkStatus = useCallback(async () => {
    if (!email) return;
    setChecking(true);
    try {
      const result = await authService.checkApproval(email);
      setStep(result.step);
      setLastChecked(new Date());
      if (result.status === 'approved' || result.status === 'rejected') {
        clearInterval(intervalRef.current);
        setAnimateOut(true);
        setTimeout(() => {
          setPhase(result.status);
          setAnimateOut(false);
        }, 350);
      }
    } finally {
      setChecking(false);
    }
  }, [email]);

  useEffect(() => {
    const t = setTimeout(() => checkStatus(), 2000);
    return () => clearTimeout(t);
  }, [checkStatus]);

  useEffect(() => {
    intervalRef.current = setInterval(checkStatus, 8000);
    return () => clearInterval(intervalRef.current);
  }, [checkStatus]);

  let title: string;
  let subtitle: string;
  let body: string;

  if (phase === 'pending') {
    title = 'Application under review';
    subtitle = `We're reviewing ${email}`;
    body = 'Our team is verifying your information. Each step is processed in order — you\'ll receive an email once everything is approved. Typical processing time is 24 hours.';
  } else if (phase === 'approved') {
    title = 'Application approved!';
    subtitle = `${email} is ready to go`;
    body = 'Your account has been verified. You can now sign in and start using StoreFlow for your business.';
  } else {
    title = 'Application not approved';
    subtitle = 'We were unable to verify your information';
    body = 'Please contact our support team for assistance or try registering again with correct details.';
  }

  return (
    <>
      <style>{`
        @keyframes sf-scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes sf-slide-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sf-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .8; } }
        @keyframes sf-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
        @keyframes sf-fade-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-8px); } }
        @keyframes sf-check-pop { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes sf-shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .sf-enter { animation: sf-slide-up .4s ease-out both; }
        .sf-exit { animation: sf-fade-out .3s ease-in both; }
        .sf-pulse { animation: sf-pulse 2s ease-in-out infinite; }
        .sf-draw { stroke-dasharray: 100; stroke-dashoffset: 100; animation: sf-draw .6s ease-out forwards; }
        .sf-check-pop { animation: sf-check-pop .35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          #sf-card, .sf-enter, .sf-exit, .sf-pulse, .sf-draw, .sf-check-pop { animation: none; }
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

          <div className={animateOut ? 'sf-exit' : 'sf-enter'} key={phase + step}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: phase === 'pending' ? '#eff5ff' : phase === 'approved' ? '#dcfce7' : '#fee2e2',
                transition: 'background .4s',
              }}>
                {phase === 'pending' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sf-pulse">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ) : phase === 'approved' ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline className="sf-draw" points="16 8 10 16 7 13"/>
                  </svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                )}
              </div>
            </div>

            <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px', textAlign: 'center' }}>
              {title}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center', margin: '0 0 20px' }}>
              {subtitle}
            </p>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 28px' }}>
              {body}
            </p>

            {/* Pipeline timeline */}
            <div style={{
              background: 'var(--paper)', borderRadius: 14, padding: '20px 22px',
              border: '1px solid var(--line-soft)', marginBottom: 28,
            }}>
              {PIPELINE.map((item, i) => {
                const done = step > i;
                const active = step === i;

                return (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '8px 0', position: 'relative',
                    opacity: done || active ? 1 : 0.45,
                    transition: 'opacity .4s',
                  }}>
                    {/* Connector line */}
                    {i > 0 && (
                      <div style={{
                        position: 'absolute', left: 12, top: 0, bottom: '50%',
                        width: 2, background: done ? 'var(--green)' : 'var(--line)',
                        transition: 'background .4s',
                      }} />
                    )}
                    {i < PIPELINE.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 12, top: '50%', bottom: 0,
                        width: 2, background: step > i ? 'var(--green)' : 'var(--line)',
                        transition: 'background .4s',
                      }} />
                    )}

                    {/* Step dot */}
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--paper-dim)',
                      color: done || active ? '#fff' : 'var(--ink-faint)',
                      fontSize: 12, fontWeight: 700, position: 'relative', zIndex: 1,
                      animation: active && phase === 'pending' ? 'sf-pulse 2s ease-in-out infinite' : done ? 'sf-check-pop .35s ease-out' : undefined,
                      boxShadow: active && phase === 'pending' ? '0 0 0 4px var(--blue-soft)' : 'none',
                      transition: 'background .4s, box-shadow .4s',
                      marginTop: 1,
                    }}>
                      {done ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : active && phase === 'pending' ? (
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', background: '#fff',
                        }} />
                      ) : (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink-faint)' }} />
                      )}
                    </div>

                    {/* Step content */}
                    <div style={{ flex: 1 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 600,
                        color: done || active ? 'var(--ink)' : 'var(--ink-soft)',
                        margin: 0, transition: 'color .4s',
                      }}>
                        {item.label}
                      </p>
                      <p style={{
                        fontSize: 11.5,
                        color: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--ink-faint)',
                        margin: '1px 0 0', fontWeight: 500, transition: 'color .4s',
                      }}>
                        {done ? 'Complete' : active ? 'Processing…' : 'Pending'}
                      </p>
                    </div>

                    {/* Active shimmer */}
                    {active && phase === 'pending' && (
                      <div style={{
                        width: 60, height: 6, borderRadius: 3, alignSelf: 'center',
                        background: 'linear-gradient(90deg, var(--blue-soft) 30%, var(--blue-border) 50%, var(--blue-soft) 70%)',
                        backgroundSize: '200px 100%',
                        animation: 'sf-shimmer 1.2s ease-in-out infinite',
                      }} />
                    )}

                    {done && (
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)', alignSelf: 'center' }}>
                        {i === 0 ? 'Just now' : `Step ${i + 1}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Last checked timestamp */}
            {lastChecked && phase === 'pending' && (
              <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-faint)', margin: '-18px 0 22px' }}>
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}

            {/* Actions */}
            {phase === 'pending' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button type="button" fullWidth onClick={checkStatus} isLoading={checking} style={{ letterSpacing: '0.01em' }}>
                  {checking ? 'Checking…' : 'Check status'}
                </Button>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
                  Auto-checks every 8 seconds · {step}/4 steps complete
                </p>
              </div>
            )}

            {phase === 'approved' && (
              <Button type="button" fullWidth onClick={() => navigate('/login')} style={{ letterSpacing: '0.01em' }}>
                Sign in to your store
              </Button>
            )}

            {phase === 'rejected' && (
              <Button type="button" fullWidth variant="ghost" onClick={() => navigate('/register')}>
                Try again
              </Button>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-faint)' }}>
            <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
