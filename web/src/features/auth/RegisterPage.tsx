import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { registerSchema, COUNTRY_CODES, type RegisterInput } from './schemas';
import { useRegister } from './hooks';
import { Button, Input, Logo } from '@/components/ui';

const STEPS = ['Business', 'Owner identity', 'Account', 'Verify'] as const;

const stepFields: [string[], string[], string[], string[]] = [
  ['storeName', 'businessType', 'currency', 'businessPhoneCode', 'businessPhone', 'businessAddress', 'businessTaxId'],
  ['ownerName', 'ownerPhoneCode', 'ownerPhone', 'ownerIdType', 'ownerIdNumber'],
  ['email', 'password'],
  [],
];

const stepIcons = [
  <svg key="biz" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  <svg key="id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  <svg key="lock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  <svg key="otp" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
];

function strength(pw: string): { label: string; pct: number; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Weak', pct: 18, color: '#dc2626' },
    { label: 'Fair', pct: 36, color: '#ea580c' },
    { label: 'Good', pct: 58, color: '#ca8a04' },
    { label: 'Strong', pct: 78, color: '#16a34a' },
    { label: 'Very strong', pct: 100, color: '#16a34a' },
  ];
  return map[Math.min(score, 4)];
}

const selBase: CSSProperties = {
  width: '100%', padding: '12px 13px',
  border: '1px solid var(--line)', borderRadius: 11,
  fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
  marginBottom: 16, background: 'var(--card)',
  transition: 'border-color .2s, box-shadow .2s',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
  cursor: 'pointer',
};

export default function RegisterPage() {
  const reg = useRegister();
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const resendInterval = useRef<ReturnType<typeof setInterval>>();

  const {
    register: regField,
    handleSubmit,
    trigger,
    watch,
    setFocus,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessType: 'Grocery / Supermarket', currency: 'USD',
      ownerIdType: 'national_id', businessPhoneCode: '+1', ownerPhoneCode: '+1',
    },
  });

  const vals = watch();
  const pw = watch('password') ?? '';
  const pwStrength = pw ? strength(pw) : null;

  const startResendTimer = useCallback(() => {
    setResendTimer(30);
    resendInterval.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(resendInterval.current); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => clearInterval(resendInterval.current);
  }, []);

  async function next() {
    const fields = stepFields[step];
    if (fields.length === 0) return;
    const valid = await trigger(fields as (keyof RegisterInput)[]);
    if (valid) advance();
  }

  function advance() {
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    if (step + 1 === 3) startResendTimer();
    setTimeout(() => {
      const name = stepFields[Math.min(step + 1, STEPS.length - 1)]?.[0] as keyof RegisterInput | undefined;
      if (name) setFocus(name);
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  function goBack() {
    setAnimKey((k) => k + 1);
    setStep((s) => Math.max(s - 1, 0));
    setTimeout(() => {
      const name = stepFields[Math.max(step - 1, 0)]?.[0] as keyof RegisterInput | undefined;
      if (name) setFocus(name);
    }, 50);
  }

  useEffect(() => {
    const name = stepFields[step]?.[0] as keyof RegisterInput | undefined;
    if (name) setFocus(name);
  }, [step, setFocus]);

  // OTP handlers
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    setOtp((prev) => {
      const next = [...prev];
      next[index] = value.slice(-1);
      return next;
    });
    setOtpError('');
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      setOtpError('');
      otpRefs.current[5]?.focus();
    }
  }

  function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setOtpError('Enter the complete 6-digit code');
      return;
    }
    reg.mutate({ ...vals, otp: code });
  }

  const selStyle = { ...selBase, outline: 'none' } as CSSProperties;

  return (
    <>
      <style>{`
        @keyframes sf-scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes sf-slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .sf-step-enter { animation: sf-slide-up .35s ease-out both; }
        .sf-btn-press:active { transform: scale(0.97); }
        .sf-select:focus { border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-soft); }
        .sf-select:hover { border-color: var(--blue-border); }
        @media (prefers-reduced-motion: reduce) {
          .sf-step-enter { animation: none; }
          #sf-card { animation: none; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f5ff 0%, #f7f9fc 50%, #eef2f8 100%)',
        padding: 24,
      }}>
        <div id="sf-card" style={{
          width: '100%', maxWidth: 520, background: 'var(--card)', borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 2px 8px -4px rgba(0,0,0,0.05)',
          padding: '40px 44px', animation: 'sf-scale-in .35s ease-out',
        } as CSSProperties}>
          <div ref={topRef} />

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
              <Logo size={32} />
              <span className="display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>StoreFlow</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>Start your 14-day free trial</p>
          </div>

          {/* Steps indicator */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
              {STEPS.map((label, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    type="button" tabIndex={i <= step ? 0 : -1}
                    onClick={() => { if (i < step) { setAnimKey((k) => k + 1); setStep(i); } }}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: i <= step ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, transition: 'background .3s, color .3s, box-shadow .3s, transform .2s',
                      background: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--paper-dim)',
                      color: i <= step ? '#fff' : 'var(--ink-faint)',
                      boxShadow: i <= step ? '0 3px 8px -2px rgba(37,99,235,.4)' : 'none',
                      transform: i === step ? 'scale(1.05)' : 'scale(1)',
                    }}>
                      {i < step ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{stepIcons[i]}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600,
                      color: i <= step ? (i < step ? 'var(--green)' : 'var(--blue)') : 'var(--ink-faint)',
                      letterSpacing: '0.02em', transition: 'color .3s',
                    }}>{label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 40, height: 2.5, margin: '0 8px 18px', borderRadius: 2, overflow: 'hidden',
                      background: 'var(--paper-dim)',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 2, transition: 'width .4s ease',
                        background: i < step ? 'var(--green)' : 'var(--line)',
                        width: i < step ? '100%' : 0,
                      }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div style={{ minHeight: step === 3 ? 280 : 260, position: 'relative' }}>
            <div key={animKey} className="sf-step-enter">
              {/* Step 0 — Business */}
              {step === 0 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Business details</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-soft)' }}>Tell us about your store.</p>
                  <Input label="Store name" placeholder="Blue Palm Grocers" error={errors.storeName?.message} {...regField('storeName')} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Business type</label>
                      <select aria-label="Business type" className="sf-select" style={selStyle} {...regField('businessType')}>
                        <option>Grocery / Supermarket</option><option>Restaurant</option><option>Pharmacy</option><option>Retail shop</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Currency</label>
                      <select aria-label="Currency" className="sf-select" style={selStyle} {...regField('currency')}>
                        <option>USD</option><option>EUR</option><option>EGP</option>
                      </select>
                    </div>
                  </div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Business phone</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <select aria-label="Country code" className="sf-select" style={{ ...selStyle, width: 130, flexShrink: 0, marginBottom: 0 }} {...regField('businessPhoneCode')}>
                      {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <div style={{ flex: 1 }}>
                      <input type="tel" placeholder="555 123 4567" className="sf-select" style={{ ...selStyle, marginBottom: 0 }} {...regField('businessPhone')} />
                      {errors.businessPhone && <p style={{ fontSize: 12, color: '#e11d48', margin: '4px 0 0' }}>{errors.businessPhone.message}</p>}
                    </div>
                  </div>
                  <Input label="Business address" placeholder="123 Main St, City, State, ZIP" error={errors.businessAddress?.message} {...regField('businessAddress')} />
                  <Input label="Tax registration ID (optional)" placeholder="12-3456789" error={errors.businessTaxId?.message} {...regField('businessTaxId')} />
                </div>
              )}

              {/* Step 1 — Owner */}
              {step === 1 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Owner identification</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-soft)' }}>Verify your identity to comply with KYC requirements.</p>
                  <Input label="Owner full name" placeholder="Amara Reyes" error={errors.ownerName?.message} {...regField('ownerName')} />
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Owner phone</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <select aria-label="Country code" className="sf-select" style={{ ...selStyle, width: 130, flexShrink: 0, marginBottom: 0 }} {...regField('ownerPhoneCode')}>
                      {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <div style={{ flex: 1 }}>
                      <input type="tel" placeholder="555 987 6543" className="sf-select" style={{ ...selStyle, marginBottom: 0 }} {...regField('ownerPhone')} />
                      {errors.ownerPhone && <p style={{ fontSize: 12, color: '#e11d48', margin: '4px 0 0' }}>{errors.ownerPhone.message}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>ID type</label>
                      <select aria-label="ID type" className="sf-select" style={selStyle} {...regField('ownerIdType')}>
                        <option value="national_id">National ID</option><option value="passport">Passport</option><option value="drivers_license">Driver's license</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>ID number</label>
                      <input aria-label="ID number" className="sf-select" style={selStyle} placeholder="e.g. AB123456" {...regField('ownerIdNumber')} />
                      {errors.ownerIdNumber && <p style={{ fontSize: 12, color: '#e11d48', margin: '-12px 0 8px' }}>{errors.ownerIdNumber.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Account */}
              {step === 2 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Create account</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-soft)' }}>Secure your account with an email and password.</p>
                  <Input label="Work email" type="email" placeholder="you@store.com" error={errors.email?.message} {...regField('email')} />
                  <div style={{ marginBottom: 16 }}>
                    <Input label="Password" type="password" placeholder="Create a strong password" error={errors.password?.message} {...regField('password')} />
                    {pw && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--paper-dim)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3, width: `${pwStrength!.pct}%`, background: pwStrength!.color,
                            transition: 'width .35s ease, background .35s ease', boxShadow: `0 0 8px ${pwStrength!.color}44`,
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <span style={{ fontSize: 11.5, color: pwStrength!.color, fontWeight: 600 }}>{pwStrength!.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{pw.length} characters</span>
                        </div>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginTop: 10,
                          padding: 10, background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line-soft)',
                        }}>
                          {[
                            { key: 'min', label: 'At least 8 characters', check: pw.length >= 8 },
                            { key: 'lower', label: 'One lowercase letter', check: /[a-z]/.test(pw) },
                            { key: 'upper', label: 'One uppercase letter', check: /[A-Z]/.test(pw) },
                            { key: 'num', label: 'One number', check: /\d/.test(pw) },
                            { key: 'special', label: 'One special character', check: /[^a-zA-Z0-9]/.test(pw) },
                          ].map((r) => (
                            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: r.check ? 'var(--green)' : 'var(--ink-faint)', transition: 'color .2s' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                {r.check ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                              </svg>
                              {r.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3 — OTP Verify */}
              {step === 3 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Verify your email</h2>
                  <p style={{ margin: '0 0 6px', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                    We sent a 6-digit code to{' '}
                    <strong style={{ color: 'var(--ink)' }}>{vals.email || 'your email'}</strong>
                  </p>

                  {/* OTP input boxes */}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '28px 0 12px' }} onPaste={handlePaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text" inputMode="numeric" autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        aria-label={`Digit ${i + 1}`}
                        style={{
                          width: 48, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
                          fontFamily: 'inherit', color: 'var(--ink)',
                          border: `2px solid ${otpError ? '#dc2626' : digit ? 'var(--blue)' : 'var(--line)'}`,
                          borderRadius: 12, background: 'var(--card)',
                          outline: 'none', transition: 'border-color .15s, box-shadow .15s',
                          caretColor: 'var(--blue)',
                        }}
                        onMouseEnter={(e) => { if (!digit && !otpError) (e.target as HTMLInputElement).style.borderColor = 'var(--blue-border)'; }}
                        onMouseLeave={(e) => { if (!digit && !otpError) (e.target as HTMLInputElement).style.borderColor = 'var(--line)'; }}
                        onFocus={(e) => { e.target.select(); e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-soft)'; }}
                        onBlur={(e) => { if (!otpError) { e.target.style.borderColor = digit ? 'var(--blue)' : 'var(--line)'; } e.target.style.boxShadow = 'none'; }}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: '#dc2626', margin: '0 0 8px' }}>{otpError}</p>
                  )}

                  <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)', margin: '8px 0 20px' }}>
                    {resendTimer > 0 ? (
                      <>Resend code in <strong>{resendTimer}s</strong></>
                    ) : (
                      <button
                        type="button" onClick={startResendTimer}
                        style={{ background: 'none', border: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', padding: 0 }}
                      >
                        Resend code
                      </button>
                    )}
                  </p>

                  {/* Review summary */}
                  <div style={{
                    background: 'var(--paper)', borderRadius: 12, padding: '14px 16px',
                    border: '1px solid var(--line-soft)',
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>Summary</p>
                    {([
                      ['Store', vals.storeName],
                      ['Type', vals.businessType],
                      ['Owner', vals.ownerName],
                      ['Email', vals.email],
                    ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: 'var(--ink-soft)' }}>
                        <span>{l}</span>
                        <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-word' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <form onSubmit={handleSubmit((v) => reg.mutate(v))} noValidate>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
              {step > 0 ? (
                <Button type="button" variant="ghost" onClick={goBack} style={{ flex: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Back
                </Button>
              ) : (
                <div style={{ flex: 1 }} />
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next} style={{ flex: 1, letterSpacing: '0.01em' }}>
                  Continue
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Button>
              ) : (
                <Button type="button" onClick={handleVerifyOtp} fullWidth isLoading={reg.isPending} style={{ letterSpacing: '0.01em' }}>
                  {reg.isPending ? 'Creating store…' : 'Create store'}
                </Button>
              )}
            </div>
          </form>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-faint)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
