import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

export default function ResendVerificationPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  // Prefilled when login redirects an unverified account here.
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const resendInterval = useRef<ReturnType<typeof setInterval>>();
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    return () => clearInterval(resendInterval.current);
  }, []);

  function startResendTimer() {
    setResendTimer(30);
    resendInterval.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(resendInterval.current); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setBusy(true);
    setError('');
    try {
      await authService.resendVerificationCode(email);
      setStep(1);
      startResendTimer();
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (ex) {
      setError((ex as Error)?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleResendCode() {
    startResendTimer();
    authService.resendVerificationCode(email).catch(() => undefined);
  }

  function handleOtpDigit(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    setOtpCode((prev) => {
      const next = prev.split('');
      next[index] = value.slice(-1);
      return next.join('');
    });
    setOtpError('');
    if (value && index < 5) otpInputsRef.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setOtpError('Enter the complete code');
      return;
    }
    setBusy(true);
    try {
      await authService.verifyEmailCode(email, otpCode);
      setStep(2);
    } catch (ex) {
      setOtpError((ex as Error)?.message || 'Verification code is invalid or has expired');
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

          {/* Step 0 — Email */}
          {step === 0 && (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Resend verification</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)' }}>Enter your email and we&apos;ll send a new verification code.</p>
              <form onSubmit={handleSendCode}>
                <Input
                  label="Email address" type="email" placeholder="you@store.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus
                  leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
                />
                {error && <p role="alert" style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 12px' }}>{error}</p>}
                <Button type="submit" fullWidth isLoading={busy}>Send verification code</Button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-faint)' }}>
                <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </div>
          )}

          {/* Step 1 — OTP */}
          {step === 1 && (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Check your email</h2>
              <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                We sent a 6-digit code to{' '}
                <strong style={{ color: 'var(--ink)' }}>{email}</strong>
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '28px 0 12px' }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { otpInputsRef.current[i] = el; }}
                    type="text" inputMode="numeric" autoComplete="one-time-code"
                    maxLength={1}
                    value={otpCode[i] || ''}
                    onChange={(e) => handleOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    aria-label={`Digit ${i + 1}`}
                    style={{
                      width: 48, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
                      fontFamily: 'inherit', color: 'var(--ink)',
                      border: `2px solid ${otpError ? 'var(--red)' : otpCode[i] ? 'var(--blue)' : 'var(--line)'}`,
                      borderRadius: 12, background: 'var(--card)', outline: 'none',
                      transition: 'border-color .15s, box-shadow .15s', caretColor: 'var(--blue)',
                    }}
                    onFocus={(e) => { e.target.select(); e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-soft)'; }}
                    onBlur={(e) => { if (!otpError) { e.target.style.borderColor = otpCode[i] ? 'var(--blue)' : 'var(--line)'; } e.target.style.boxShadow = 'none'; }}
                  />
                ))}
              </div>

              {otpError && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--red)', margin: '0 0 8px' }}>{otpError}</p>}

              <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)', margin: '8px 0 0' }}>
                {resendTimer > 0 ? (
                  <>Resend code in <strong>{resendTimer}s</strong></>
                ) : (
                  <button type="button" onClick={handleResendCode}
                    style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', padding: 0 }}
                  >Resend code</button>
                )}
              </p>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <Button type="button" variant="ghost" onClick={() => setStep(0)} style={{ flex: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </Button>
                <Button type="button" onClick={handleVerifyOtp} isLoading={busy} style={{ flex: 1, letterSpacing: '0.01em' }}>
                  Verify
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </Button>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 2 && (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Email verified</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)' }}>Your email has been verified successfully.</p>
              <div style={{
                padding: 16, borderRadius: 12, background: 'var(--green-soft)',
                border: '1px solid #c4d9c8', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p style={{ fontSize: 13, color: 'var(--green-deep)', margin: 0, lineHeight: 1.5 }}>
                  You can now sign in with your verified account.
                </p>
              </div>
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button type="button" fullWidth>Sign in</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
