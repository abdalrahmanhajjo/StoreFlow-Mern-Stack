import { type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { resetPasswordSchema, type ResetPasswordInput } from './schemas';
import { authService } from './authService';
import { Button, Input, Logo } from '@/components/ui';
import type { ApiErr } from '@/lib/api';

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

// Reached via the link CLIENT_APP_URL/reset-password?token=... emailed by
// forgotPassword() in auth.controller.ts.
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const reset = useMutation<void, ApiErr, ResetPasswordInput>({
    mutationFn: (input) => authService.resetPassword(token!, input.password),
  });

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

          {!token && (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Invalid reset link</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)' }}>This link is missing its reset token. Request a new one below.</p>
              <Button type="button" fullWidth onClick={() => navigate('/reset')}>Request new link</Button>
            </div>
          )}

          {token && !reset.isSuccess && (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Create new password</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)' }}>Choose a strong password for your account.</p>

              {reset.isError && (
                <div role="alert" style={{
                  background: 'var(--red-soft)', color: 'var(--red-deep)', border: '1px solid #e5c4bd',
                  borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16, fontWeight: 500,
                }}>
                  {reset.error.message || 'This link is invalid or has expired.'}
                </div>
              )}

              <form onSubmit={handleSubmit((v) => reset.mutate(v))} noValidate>
                <Input
                  id="new-pw"
                  label="New password" type="password" placeholder="At least 8 characters"
                  error={errors.password?.message}
                  leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  {...register('password')}
                />
                <Input
                  label="Confirm password" type="password" placeholder="Repeat your password"
                  error={errors.confirmPassword?.message}
                  leftIcon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                  {...register('confirmPassword')}
                />
                <Button type="submit" fullWidth isLoading={reset.isPending}>Reset password</Button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 22, fontSize: 13, color: 'var(--ink-faint)' }}>
                <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </div>
          )}

          {reset.isSuccess && (
            <div className="sf-enter">
              <h2 className="display" style={{ fontSize: 23, fontWeight: 800, color: 'var(--ink)', margin: '0 0 4px' }}>Password reset</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-soft)' }}>Your password has been updated successfully.</p>
              <div style={{
                padding: 16, borderRadius: 12, background: 'var(--green-soft)',
                border: '1px solid #c4d9c8', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d43" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p style={{ fontSize: 13, color: 'var(--green-deep)', margin: 0, lineHeight: 1.5 }}>
                  All other sessions on this account were signed out too. Please sign in again.
                </p>
              </div>
              <Button type="button" fullWidth onClick={() => navigate('/login')}>Sign in</Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}