import { useEffect, useRef, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { loginSchema, type LoginInput } from './schemas';
import { useLogin } from './hooks';
import { Button, Input, Logo } from '@/components/ui';
import { safeLoginReason, getLoginMessage } from '@/lib/security/url';

const filledInput: CSSProperties = { background: 'var(--paper-raise)' };

/** Silk-wave canvas for the dark brand panel. Thin monochrome threads drift
 * slowly on their own; near the pointer they swell, bend and brighten like
 * fabric being brushed. Reduced motion gets a single frozen frame. */
function SilkWaves() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, energy: 0, over: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => { resize(); });
    ro.observe(parent);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - rect.left;
      mouse.ty = e.clientY - rect.top;
      mouse.over = true;
    };
    const onLeave = () => { mouse.over = false; };
    parent.addEventListener('pointermove', onMove);
    parent.addEventListener('pointerleave', onLeave);

    const LINES = 26;
    const STEP = 8;
    let t = Math.random() * 100;

    const drawFrame = () => {
      ctx.clearRect(0, 0, w, h);
      if (w < 2 || h < 2) return;
      for (let i = 0; i < LINES; i++) {
        const yBase = (h * (i + 0.5)) / LINES;
        const phase = i * 0.55;
        ctx.beginPath();
        for (let x = -STEP; x <= w + STEP; x += STEP) {
          const idle =
            Math.sin(x * 0.006 + t * 2 + phase) * 7 +
            Math.sin(x * 0.0023 - t * 1.3 + phase * 1.7) * 12;
          const dx = x - mouse.x;
          const dy = yBase - mouse.y;
          const influence = Math.exp(-(dx * dx + dy * dy) / 26000) * mouse.energy;
          const swell = Math.sin(x * 0.02 + t * 6 + phase) * 30 * influence;
          const y = yBase + idle + swell - dy * 0.35 * influence;
          if (x === -STEP) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const rowDy = yBase - mouse.y;
        const glow = Math.exp(-(rowDy * rowDy) / 22000) * mouse.energy;
        const shimmer = Math.sin(phase + t) ** 2;
        ctx.strokeStyle = `rgba(244,244,241,${(0.045 + 0.03 * shimmer + 0.22 * glow).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const loop = () => {
      t += 0.004;
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
      mouse.energy += ((mouse.over ? 1 : 0) - mouse.energy) * 0.05;
      drawFrame();
      raf = requestAnimationFrame(loop);
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) {
      drawFrame(); // static texture, no animation
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      parent.removeEventListener('pointermove', onMove);
      parent.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const rawReturnTo = params.get('returnTo');
  const returnTo = rawReturnTo && /^\/(?!\/)/.test(rawReturnTo) ? rawReturnTo : undefined;
  const reason = safeLoginReason(params.get('reason'));
  const login = useLogin(returnTo);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { remember: true } });

  const isPending = login.error?.code === 'PENDING_APPROVAL';

  return (
    <>
      <style>{`
        @keyframes sf-scale-in { from { opacity: 0; transform: scale(0.985); } to { opacity: 1; transform: scale(1); } }
        @keyframes sf-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
        .sf-shake { animation: sf-shake .4s ease-out; }
        .sf-auth-split {
          width: 100%;
          min-height: calc(100vh - 32px);
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
          animation: sf-scale-in .35s ease-out;
        }
        .sf-auth-brand {
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(24px, 3vw, 40px);
          color: var(--shell-text);
        }
        .sf-auth-brand > a,
        .sf-auth-brand > div {
          position: relative;
          z-index: 1;
        }
        .sf-auth-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          color: var(--shell-text);
          font-size: 13.5px;
          font-weight: 600;
          opacity: .85;
          transition: opacity .15s ease;
        }
        .sf-auth-back:hover { opacity: 1; }
        .sf-auth-tagline h2 {
          margin: 0 0 14px;
          font-size: clamp(1.9rem, 3.2vw, 2.8rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.12;
          max-width: 14ch;
        }
        .sf-auth-tagline h2 span { color: var(--shell-muted); }
        .sf-auth-tagline p {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--shell-muted);
          max-width: 40ch;
        }
        .sf-auth-pane {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: clamp(28px, 4vw, 48px);
          overflow-y: auto;
        }
        .sf-auth-body {
          width: 100%;
          max-width: 420px;
          margin: auto 0;
        }
        .sf-auth-foot {
          width: 100%;
          text-align: center;
          font-size: 13px;
          color: var(--ink-faint);
          padding-top: 28px;
        }
        .sf-auth-foot b { color: var(--ink); font-weight: 700; }
        @media (max-width: 900px) {
          .sf-auth-split { grid-template-columns: 1fr; min-height: auto; }
          .sf-auth-brand { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-auth-split { animation: none; }
          .sf-shake { animation: none; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--paper)', padding: 16, display: 'flex' }}>
        <div className="sf-auth-split">
          <aside className="sf-auth-brand sf-brand-gradient">
            <SilkWaves />
            <Link to="/" className="sf-auth-back">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M16 4v16L4 12z" />
              </svg>
              Back
            </Link>
            <div className="sf-auth-tagline">
              <h2 className="display">
                <span>Run the whole store</span><br />with StoreFlow
              </h2>
              <p>Point of sale, inventory, suppliers and loyalty — one workspace for your whole team.</p>
            </div>
          </aside>

          <div className="sf-auth-pane">
            <div className="sf-auth-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 36 }}>
                <Logo size={34} />
                <span className="display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>StoreFlow</span>
              </div>

              <h1 className="display" style={{ fontSize: 27, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Welcome back</h1>
              <p style={{ margin: '0 0 26px', fontSize: 14, color: 'var(--ink-soft)' }}>
                Sign in to your account to continue your journey with StoreFlow
              </p>

              {reason && (
                <div role="status" style={{
                  background: 'var(--yellow-soft)', color: 'var(--yellow-deep)',
                  border: '1px solid #e6d7b5', borderRadius: 10,
                  padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500,
                }}>
                  {getLoginMessage(reason)}
                </div>
              )}

              {login.isError && !isPending && (
                <div role="alert" className="sf-shake" style={{
                  background: 'var(--red-soft)', color: 'var(--red-deep)', border: '1px solid #e5c4bd',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500,
                }}>
                  {login.error.message}
                </div>
              )}

              {login.isError && isPending && (
                <div role="alert" style={{
                  background: 'var(--blue-soft)', color: 'var(--blue-deep)', border: '1px solid var(--blue-border)',
                  borderRadius: 10, padding: '14px', fontSize: 13, marginBottom: 16, textAlign: 'center',
                }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131312" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Account under review
                  </p>
                  <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>Your registration is still being reviewed. We&apos;ll email you once approved.</p>
                  <Link to="/pending-approval" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none', fontSize: 12.5 }}>Check status →</Link>
                </div>
              )}

              {!isPending && (
                <form onSubmit={handleSubmit((v) => login.mutate(v))} noValidate>
                  <Input
                    label="Email address*" type="email" placeholder="Enter your email"
                    autoComplete="email" error={errors.email?.message}
                    style={filledInput}
                    {...register('email')}
                  />
                  <Input
                    label="Password*" type="password" placeholder="••••••••"
                    autoComplete="current-password" error={errors.password?.message}
                    style={filledInput}
                    {...register('password')}
                  />
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ink-soft)', cursor: 'pointer', userSelect: 'none', fontSize: 13, margin: '2px 0 20px' }}>
                    <input type="checkbox" {...register('remember')} style={{ accentColor: 'var(--blue)', width: 15, height: 15, cursor: 'pointer' }} />{' '}
                    Remember me
                  </label>
                  <Button type="submit" fullWidth isLoading={login.isPending}>
                    {login.isPending ? 'Signing in…' : 'Sign in'}
                  </Button>
                </form>
              )}

              {!isPending && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, fontSize: 13, gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--ink-faint)' }}>
                      Don&apos;t have an account?{' '}
                      <Link to="/register" style={{ color: 'var(--ink)', fontWeight: 700, textDecoration: 'none' }}>Sign up</Link>
                    </span>
                    <Link to="/reset" style={{ color: 'var(--ink-faint)', fontWeight: 500, textDecoration: 'none' }}>Forgot password?</Link>
                    <Link to="/resend-verification" style={{ color: 'var(--ink-faint)', fontWeight: 500, textDecoration: 'none' }}>Resend verification</Link>
                  </div>

                </>
              )}
            </div>

            <div className="sf-auth-foot">
              Powered by <b>StoreFlow</b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
