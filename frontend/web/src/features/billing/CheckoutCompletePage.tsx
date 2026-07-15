import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { useSession } from '@/store/session';
import { Logo, Button } from '@/components/ui';

type Status = 'loading' | 'processing' | 'active' | 'trialing' | 'failed' | 'expired' | 'error';

export default function CheckoutCompletePage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const isMock = searchParams.get('mock') === 'true';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  // A signed-in user got here from a plan change — send them back to billing.
  // A fresh registration continues to store setup / email verification.
  const isSignedIn = useSession((s) => s.status === 'authenticated');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('No session ID provided. Please try again from the billing page.');
      return;
    }

    setStatus('processing');

    if (isMock) {
      // Fake payment: simulate success after a short delay
      const timer = setTimeout(() => {
        setStatus('active');
        setMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }

    pollRef.current = setInterval(async () => {
      try {
        // Session-scoped public endpoint: works before the user has verified
        // their email or logged in (the common state right after payment).
        const res = await api.get(`/v1/billing/checkout-sessions/${sessionId}/status`);
        const subStatus = res.data?.data?.status;

        if (subStatus === 'active' || subStatus === 'trialing') {
          setStatus(subStatus === 'trialing' ? 'trialing' : 'active');
          setMessage('');
          clearInterval(pollRef.current);
        } else if (subStatus === 'incomplete' || subStatus === 'pending') {
          // Still waiting for webhook
        } else if (subStatus === 'none' || subStatus === 'expired') {
          setStatus('expired');
          setMessage('Your checkout session has expired. Please try again.');
          clearInterval(pollRef.current);
        } else if (subStatus === 'past_due' || subStatus === 'cancelled') {
          setStatus('failed');
          setMessage('There was an issue with your payment. Please try again.');
          clearInterval(pollRef.current);
        }
      } catch {
        // Polling errors are expected during redirect — keep trying
      }
    }, 2000);

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollRef.current);
      setStatus('error');
      setMessage('Activation is taking longer than expected. Your subscription may still be processing. Check your billing page in a few minutes.');
    }, 120000);

    return () => {
      clearInterval(pollRef.current);
      clearTimeout(timeout);
    };
  }, [sessionId, isMock]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: 'var(--card)', borderRadius: 20,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '40px 36px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
          <Logo size={28} />
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>StoreFlow</span>
        </div>

        {/* Loading state */}
        {(status === 'loading' || status === 'processing') && (
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              border: '3px solid var(--line-soft)', borderTopColor: 'var(--blue)',
              animation: 'sf-spin .8s linear infinite',
            }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
              {status === 'loading' ? 'Preparing your checkout…' : 'Activating your subscription…'}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: 0 }}>
              {status === 'loading'
                ? 'Please wait while we set up your payment session.'
                : 'Your payment is being processed. This should only take a moment.'}
            </p>
          </div>
        )}

        {/* Success — active */}
        {(status === 'active' || status === 'trialing') && (
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>
              {status === 'trialing' ? 'Trial started!' : 'Subscription active!'}
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 24px' }}>
              {status === 'trialing'
                ? 'Your free trial is now active. Explore all the features of your plan.'
                : 'Your payment was successful and your subscription is now active.'}
            </p>
            <Link to={isSignedIn ? '/settings/billing' : '/register'} style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>
                {isSignedIn ? 'Back to billing' : 'Set up your store'}
              </Button>
            </Link>
          </div>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: 'var(--amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--amber-deep)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>Session expired</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 24px' }}>{message}</p>
            <Link to="/settings/billing" style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>Try again</Button>
            </Link>
          </div>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: 'var(--red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>Payment failed</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 24px' }}>{message}</p>
            <Link to="/settings/billing" style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>Try again</Button>
            </Link>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              background: 'var(--red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>Something went wrong</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 24px' }}>{message}</p>
            <Link to="/settings/billing" style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>Go to billing</Button>
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes sf-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
