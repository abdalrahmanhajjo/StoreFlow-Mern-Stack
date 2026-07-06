import { type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { loginSchema, type LoginInput } from './schemas';
import { useLogin } from './hooks';
import { Button, Input, Logo } from '@/components/ui';

const s: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0f5ff 0%, #f7f9fc 50%, #eef2f8 100%)',
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

export default function LoginPage() {
  const [params] = useSearchParams();
  const returnTo = params.get('returnTo') || undefined;
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
        @keyframes sf-scale-in { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes sf-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }
        .sf-shake { animation: sf-shake .4s ease-out; }
        .sf-btn-press:active { transform: scale(0.97); }
        @media (prefers-reduced-motion: reduce) {
          #sf-card { animation: none; }
          .sf-shake { animation: none; }
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

          <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Welcome back</h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)' }}>Sign in to your store workspace.</p>

          {login.isError && !isPending && (
            <div role="alert" className="sf-shake" style={{
              background: 'var(--red-soft)', color: '#b91c1c', border: '1px solid #f4c9c9',
              borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500,
            }}>
              {login.error.message}
            </div>
          )}

          {login.isError && isPending && (
            <div role="alert" style={{
              background: '#eff5ff', color: '#1e40af', border: '1px solid var(--blue-border)',
              borderRadius: 10, padding: '14px', fontSize: 13, marginBottom: 16, textAlign: 'center',
            }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 6 }}>
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
                label="Email address" type="email" placeholder="you@store.com"
                autoComplete="email" error={errors.email?.message}
                leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>}
                {...register('email')}
              />
              <Input
                label="Password" type="password" placeholder="••••••••"
                autoComplete="current-password" error={errors.password?.message}
                leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                {...register('password')}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0 22px', fontSize: 13 }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--ink-soft)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" {...register('remember')} style={{ accentColor: 'var(--blue)', width: 15, height: 15, cursor: 'pointer' }} />{' '}
                  Remember me
                </label>
                <Link to="/reset" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <Button type="submit" fullWidth isLoading={login.isPending}>
                {login.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          )}

          {!isPending && (
            <>
              <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--ink-faint)' }}>
                New to StoreFlow?{' '}
                <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Create account</Link>
              </p>
              <div style={{
                marginTop: 16, padding: '12px 14px', background: 'var(--paper)',
                borderRadius: 10, border: '1px solid var(--line-soft)', fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.6,
              }}>
                <strong style={{ color: 'var(--ink-soft)' }}>Demo credentials</strong><br />
                Use any email with role prefix (<strong>admin@</strong>, <strong>owner@</strong>, <strong>manager@</strong>, <strong>cashier@</strong>).<br />
                Enter <strong>fail</strong> as password to see the error state.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
