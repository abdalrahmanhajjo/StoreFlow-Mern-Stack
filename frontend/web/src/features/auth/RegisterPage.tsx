import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { registerSchema, type RegisterInput } from './schemas';
import { useRegister, useVerifyEmail, VERIFY_EMAIL_STORAGE_KEY } from './hooks';
import { authService } from './authService';
import { Button, Input, Logo, PhoneCodeSelect, toast, Spinner } from '@/components/ui';

const STEPS = ['Business', 'Owner identity', 'Account', 'Plan', 'Verify'] as const;

const stepFields: [string[], string[], string[], string[], string[]] = [
  ['storeName', 'businessType', 'currency', 'businessPhoneCode', 'businessPhone', 'businessAddress', 'businessTaxId'],
  ['ownerName', 'ownerPhoneCode', 'ownerPhone', 'ownerIdType', 'ownerIdNumber'],
  ['email', 'password'],
  [],
  [],
];

const stepIcons = [
  <svg key="biz" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  <svg key="id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  <svg key="lock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  <svg key="plan" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
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
    { label: 'Weak', pct: 18, color: 'var(--red)' },
    { label: 'Fair', pct: 36, color: '#9a6635' },
    { label: 'Good', pct: 58, color: 'var(--amber-deep)' },
    { label: 'Strong', pct: 78, color: 'var(--green)' },
    { label: 'Very strong', pct: 100, color: 'var(--green)' },
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

interface PricingPlan {
  publicId: string;
  code: string;
  name: string;
  description: string;
  shortDescription: string;
  isRecommended: boolean;
  displayOrder: number;
  supportedIntervals: Array<'monthly' | 'yearly'>;
  billing: { currency: string; monthlyPriceMinor: number; yearlyPriceMinor: number };
  features: Record<string, boolean>;
  limits: Record<string, number>;
  trial: { enabled: boolean; durationDays: number };
}

function formatMinor(amount: number): string {
  return '$' + (amount / 100).toFixed(2);
}



export default function RegisterPage() {
  const reg = useRegister();
  const verify = useVerifyEmail();
  const [searchParams] = useSearchParams();
  const preselectedPlan = searchParams.get('plan');
  const preselectedInterval = searchParams.get('interval') as 'monthly' | 'yearly' | null;
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(0);
  const resendInterval = useRef<ReturnType<typeof setInterval>>();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>(preselectedInterval === 'yearly' ? 'yearly' : 'monthly');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/v1/billing/plans');
        const body = res.data as { data?: PricingPlan[] } | PricingPlan[] | undefined;
        const list = Array.isArray(body) ? body : body?.data ?? [];
        setPlans(list);
        if (preselectedPlan) {
          const match = list.find((p: PricingPlan) => p.publicId === preselectedPlan || p.code === preselectedPlan);
          if (match) setSelectedPlanId(match.publicId);
        }
      } catch { /* ignore */ }
      setPlansLoading(false);
    })();
  }, [preselectedPlan]);

  const startResendTimer = useCallback(() => {
    setResendTimer(30);
    resendInterval.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(resendInterval.current); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  // Free plan registration succeeds → advance to Verify step
  useEffect(() => {
    if (reg.isSuccess && !reg.data?.checkout?.url) {
      setAnimKey((k) => k + 1);
      setStep(4);
      startResendTimer();
    }
  }, [reg.isSuccess, reg.data, startResendTimer]);

  const {
    register: regField,
    trigger,
    watch,
    setFocus,
    setValue,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessType: 'Grocery / Supermarket', currency: 'USD',
      ownerIdType: 'national_id', businessPhoneCode: '+1', ownerPhoneCode: '+1',
      storeName: '', businessPhone: '', businessAddress: '', businessTaxId: '',
      ownerName: '', ownerPhone: '', ownerIdNumber: '', email: '', password: '', otp: '',
    },
  });

  // Returning from a paid-plan checkout: the account already exists and the
  // code was emailed during registration — jump straight to the OTP step.
  useEffect(() => {
    if (!searchParams.get('verify')) return;
    const email = searchParams.get('email') ?? sessionStorage.getItem(VERIFY_EMAIL_STORAGE_KEY) ?? '';
    if (!email) return;
    setValue('email', email);
    setAnimKey((k) => k + 1);
    setStep(4);
    startResendTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // react-hook-form's watch() is incompatible with React Compiler memoization;
  // the compiler skips this component, which is expected and safe here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const vals = watch();
  const pw = watch('password') ?? '';
  const pwStrength = pw ? strength(pw) : null;

  useEffect(() => {
    return () => clearInterval(resendInterval.current);
  }, []);

  async function next() {
    const fields = stepFields[step];
    if (fields.length > 0) {
      const valid = await trigger(fields as (keyof RegisterInput)[]);
      if (!valid) return;
    }
    // Leaving the Plan step submits the registration — the server creates
    // the store + owner and emails the 6-digit code the Verify step asks for.
    // For paid plans the hook redirects to Stripe Checkout; for free plans
    // we advance to the OTP verification step.
    if (step === 3) {
      const payload = { ...vals, planPublicId: selectedPlanId ?? undefined, billingInterval };
      reg.mutate(payload);
      return;
    }
    advance();
  }

  function advance() {
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    if (step + 1 === 4) startResendTimer();
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
    verify.mutate(
      { email: vals.email, code },
      { onError: (err) => setOtpError(err.message || 'Verification failed — check the code and try again') }
    );
  }

  function handleResendCode() {
    startResendTimer();
    authService
      .resendVerificationCode(vals.email)
      .then(() => toast.success('New code sent', vals.email))
      .catch(() => toast.error('Could not resend the code. Please try again.'));
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
        .sf-steps-caption { display: none; }
        /* Phone layout: the card's desktop padding + fixed-width step dots and
           OTP boxes overflow a ~375px viewport, so everything tightens up and
           the two-column field grids stack. 16px inputs stop iOS focus-zoom. */
        @media (max-width: 520px) {
          .sf-reg-page { padding: 12px !important; }
          #sf-card { padding: 26px 16px !important; }
          .sf-reg-page input, .sf-reg-page select { font-size: 16px !important; }
          .sf-step-label { display: none; }
          .sf-step-dot { width: 30px !important; height: 30px !important; }
          .sf-step-line { width: 14px !important; margin: 0 4px !important; }
          .sf-steps-caption {
            display: block; text-align: center; font-size: 12.5px; font-weight: 600;
            color: var(--ink-soft); margin: 10px 0 0;
          }
          .sf-grid-2 { grid-template-columns: 1fr !important; }
          .sf-otp-row { gap: 6px !important; }
          .sf-reg-page .sf-otp-box {
            flex: 1 1 0; min-width: 0; width: auto !important;
            height: 50px !important; font-size: 19px !important;
          }
        }
      `}</style>

      <div className="sf-reg-page" style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--paper)',
        padding: 24,
      }}>
        <div id="sf-card" style={{
          width: '100%', maxWidth: 520, background: 'var(--card)', borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 2px 8px -4px rgba(0,0,0,0.05)',
          padding: '40px 44px', animation: 'sf-scale-in .35s ease-out',
          // Safe centering: auto margins center the card when it fits the
          // viewport but collapse to 0 when it's taller, so the top of a long
          // step is never clipped off-screen (flex align-center would clip).
          margin: 'auto 0',
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
                    // Names the button even on phones, where the visible
                    // label is display:none and would otherwise leave it nameless.
                    aria-label={`Step ${i + 1}: ${label}`}
                    onClick={() => { if (i < step) { setAnimKey((k) => k + 1); setStep(i); } }}
                    style={{
                      background: 'none', border: 'none', padding: 0, cursor: i <= step ? 'pointer' : 'default',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    }}
                  >
                    <div className="sf-step-dot" style={{
                      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, transition: 'background .3s, color .3s, box-shadow .3s, transform .2s',
                      background: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--paper-dim)',
                      color: i <= step ? 'var(--card)' : 'var(--ink-faint)',
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
                    <span className="sf-step-label" style={{
                      fontSize: 10.5, fontWeight: 600,
                      color: i <= step ? (i < step ? 'var(--green)' : 'var(--blue)') : 'var(--ink-faint)',
                      letterSpacing: '0.02em', transition: 'color .3s',
                    }}>{label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className="sf-step-line" style={{
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
            {/* Phone-only caption: replaces the per-dot labels hidden at small widths. */}
            <p className="sf-steps-caption" aria-hidden>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
          </div>

          {/* Step content */}
          <div style={{ minHeight: step === 4 ? 280 : step === 3 ? 340 : 260, position: 'relative' }}>
            <div key={animKey} className="sf-step-enter">
              {/* Step 0 — Business */}
              {step === 0 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Business details</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-soft)' }}>Tell us about your store.</p>
                  <Input label="Store name" placeholder="Blue Palm Grocers" error={errors.storeName?.message} {...regField('storeName')} required />
                  <div className="sf-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Business type <span aria-hidden style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
                      <select aria-label="Business type" required className="sf-select" style={selStyle} {...regField('businessType')}>
                        <option>Grocery / Supermarket</option><option>Restaurant</option><option>Pharmacy</option><option>Retail shop</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Currency <span aria-hidden style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
                      <select aria-label="Currency" required className="sf-select" style={selStyle} {...regField('currency')}>
                        <option>USD</option><option>EUR</option><option>EGP</option>
                      </select>
                    </div>
                  </div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Business phone <span aria-hidden style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: errors.businessPhone ? 2 : 16 }}>
                    <Controller
                      name="businessPhoneCode"
                      control={control}
                      render={({ field }) => (
                        <PhoneCodeSelect
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          error={errors.businessPhoneCode?.message}
                        />
                      )}
                    />
                    <div style={{ flex: 1 }}>
                      <input type="tel" placeholder="555 123 4567" className="sf-select" style={{ ...selStyle, marginBottom: 0, borderColor: errors.businessPhone ? 'var(--red)' : undefined }} {...regField('businessPhone')} />
                    </div>
                  </div>
                  {(errors.businessPhoneCode || errors.businessPhone) && (
                    <p style={{ fontSize: 12, color: 'var(--red)', margin: '0 0 12px' }}>{errors.businessPhoneCode?.message || errors.businessPhone?.message}</p>
                  )}
                  <Input label="Business address" placeholder="123 Main St, City, State, ZIP" error={errors.businessAddress?.message} {...regField('businessAddress')} required />
                  <Input label="Tax registration ID (optional)" placeholder="12-3456789" error={errors.businessTaxId?.message} {...regField('businessTaxId')} />
                </div>
              )}

              {/* Step 1 — Owner */}
              {step === 1 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Owner identification</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-soft)' }}>Verify your identity to comply with KYC requirements.</p>
                  <Input label="Owner full name" placeholder="Amara Reyes" error={errors.ownerName?.message} {...regField('ownerName')} required />
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Owner phone <span aria-hidden style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: errors.ownerPhoneCode || errors.ownerPhone ? 2 : 16 }}>
                    <Controller
                      name="ownerPhoneCode"
                      control={control}
                      render={({ field }) => (
                        <PhoneCodeSelect
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          error={errors.ownerPhoneCode?.message}
                        />
                      )}
                    />
                    <div style={{ flex: 1 }}>
                      <input type="tel" placeholder="555 987 6543" className="sf-select" style={{ ...selStyle, marginBottom: 0, borderColor: errors.ownerPhone ? 'var(--red)' : undefined }} {...regField('ownerPhone')} />
                    </div>
                  </div>
                  {(errors.ownerPhoneCode || errors.ownerPhone) && (
                    <p style={{ fontSize: 12, color: 'var(--red)', margin: '0 0 12px' }}>{errors.ownerPhoneCode?.message || errors.ownerPhone?.message}</p>
                  )}
                  <div className="sf-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>ID type <span aria-hidden style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
                      <select aria-label="ID type" required className="sf-select" style={selStyle} {...regField('ownerIdType')}>
                        <option value="national_id">National ID</option><option value="passport">Passport</option><option value="drivers_license">Driver's license</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>ID number <span aria-hidden style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
                      <input aria-label="ID number" className="sf-select" style={{ ...selStyle, borderColor: errors.ownerIdNumber ? 'var(--red)' : undefined }} placeholder="e.g. AB123456" {...regField('ownerIdNumber')} />
                      {errors.ownerIdNumber && <p style={{ fontSize: 12, color: 'var(--red)', margin: '4px 0 0' }}>{errors.ownerIdNumber.message}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 — Account */}
              {step === 2 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Create account</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-soft)' }}>Secure your account with an email and password.</p>
                  <Input label="Work email" type="email" placeholder="you@store.com" error={errors.email?.message} {...regField('email')} required />
                  <div style={{ marginBottom: 16 }}>
                    <Input label="Password" type="password" placeholder="Create a strong password" error={errors.password?.message} {...regField('password')} required />
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
                        <div className="sf-grid-2" style={{
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

              {/* Step 3 — Plan selection */}
              {step === 3 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Choose your plan</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                    Select the right plan for your business. Start with a 14-day free trial on any paid plan.
                  </p>

                  {/* Interval toggle */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--paper)', borderRadius: 10, padding: 3 }}>
                      <button
                        type="button" onClick={() => setBillingInterval('monthly')}
                        style={{
                          padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                          background: billingInterval === 'monthly' ? 'var(--card)' : 'transparent',
                          color: billingInterval === 'monthly' ? 'var(--ink)' : 'var(--ink-faint)',
                          boxShadow: billingInterval === 'monthly' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all .2s',
                        }}
                      >
                        Monthly
                      </button>
                      <button
                        type="button" onClick={() => setBillingInterval('yearly')}
                        style={{
                          padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                          background: billingInterval === 'yearly' ? 'var(--card)' : 'transparent',
                          color: billingInterval === 'yearly' ? 'var(--ink)' : 'var(--ink-faint)',
                          boxShadow: billingInterval === 'yearly' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                          transition: 'all .2s',
                        }}
                      >
                        Yearly <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>Save ~17%</span>
                      </button>
                    </div>
                  </div>

                  {plansLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {plans
                        .filter((p) => p.isRecommended || true)
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((plan) => {
                          const price = billingInterval === 'yearly' ? plan.billing.yearlyPriceMinor : plan.billing.monthlyPriceMinor;
                          const selected = selectedPlanId === plan.publicId;
                          return (
                            <button
                              type="button" key={plan.publicId}
                              onClick={() => setSelectedPlanId(plan.publicId)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 14,
                                padding: '14px 16px', borderRadius: 12, border: `2px solid ${selected ? 'var(--blue)' : 'var(--line-soft)'}`,
                                background: selected ? 'var(--blue-soft, #eef4ff)' : 'var(--card)',
                                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', width: '100%',
                                transition: 'border-color .2s, background .2s',
                                position: 'relative',
                              }}
                            >
                              {plan.isRecommended && (
                                <span style={{
                                  position: 'absolute', top: -8, right: 12, fontSize: 10, fontWeight: 700,
                                  background: 'var(--blue)', color: '#fff', padding: '2px 10px', borderRadius: 999,
                                }}>
                                  POPULAR
                                </span>
                              )}
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? 'var(--blue)' : 'var(--line)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                {selected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--blue)' }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{plan.name}</span>
                                  <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)' }}>
                                    {price === 0 ? 'Free' : formatMinor(price)}
                                  </span>
                                  {price > 0 && <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>}
                                </div>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
                                  {plan.shortDescription || plan.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4 — OTP Verify */}
              {step === 4 && (
                <div>
                  <h2 className="display" style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Verify your email</h2>
                  <p style={{ margin: '0 0 6px', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                    We sent a 6-digit code to{' '}
                    <strong style={{ color: 'var(--ink)' }}>{vals.email || 'your email'}</strong>
                  </p>

                  {/* OTP input boxes */}
                  <div className="sf-otp-row" style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '28px 0 12px' }} onPaste={handlePaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        className="sf-otp-box"
                        type="text" inputMode="numeric" autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        aria-label={`Digit ${i + 1}`}
                        style={{
                          width: 48, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
                          fontFamily: 'inherit', color: 'var(--ink)',
                          border: `2px solid ${otpError ? 'var(--red)' : digit ? 'var(--blue)' : 'var(--line)'}`,
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
                    <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--red)', margin: '0 0 8px' }}>{otpError}</p>
                  )}

                  <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)', margin: '8px 0 20px' }}>
                    {resendTimer > 0 ? (
                      <>Resend code in <strong>{resendTimer}s</strong></>
                    ) : (
                      <button
                        type="button" onClick={handleResendCode}
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
                      ['Plan', selectedPlanId ? plans.find((p) => p.publicId === selectedPlanId)?.name ?? billingInterval : 'Free'],
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
          <form onSubmit={(e) => { e.preventDefault(); if (step < STEPS.length - 1) next(); else handleVerifyOtp(); }} noValidate>
            {/* Hidden fields for plan selection */}
            <input type="hidden" {...regField('planPublicId')} value={selectedPlanId ?? ''} />
            <input type="hidden" {...regField('billingInterval')} value={billingInterval} />
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
                <Button type="button" onClick={next} isLoading={reg.isPending} style={{ flex: 1, letterSpacing: '0.01em' }}>
                  {reg.isPending ? 'Creating store…' : step === 3 ? 'Create store' : 'Continue'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Button>
              ) : (
                <Button type="button" onClick={handleVerifyOtp} fullWidth isLoading={verify.isPending} style={{ letterSpacing: '0.01em' }}>
                  {verify.isPending ? 'Verifying…' : 'Create store'}
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
