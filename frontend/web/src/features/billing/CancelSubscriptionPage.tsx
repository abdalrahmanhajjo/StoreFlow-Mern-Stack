import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, toast } from '@/components/ui';
import { billingService } from './billingService';
import { usePlanLimits } from '@/features/subscriptions/usePlanLimits';

export default function CancelSubscriptionPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { data: limits } = usePlanLimits();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const planName = limits?.plan?.name ?? 'Free';
  const periodEnd = limits?.currentPeriodEnd ?? null;

  async function handleCancel() {
    setBusy(true);
    try {
      const res = await billingService.cancelSubscription(reason || undefined);
      toast.success(res?.message ?? 'Subscription cancelled');
      setDone(true);
    } catch {
      toast.error('Could not cancel subscription');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div style={{ padding: isMobile ? 16 : 20 }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          padding: isMobile ? 24 : 40, textAlign: 'center', maxWidth: 500, margin: '40px auto',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', margin: '0 0 6px' }}>Cancellation scheduled</h2>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 4px' }}>
            Your <strong>{planName}</strong> plan will remain active until{' '}
            <strong>{periodEnd ? new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the end of your billing period'}</strong>.
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.5, margin: '0 0 20px' }}>
            After that, your account will be downgraded. You can reactivate anytime before the cancellation date.
          </p>
          <Link to="/settings/billing" style={{ textDecoration: 'none' }}>
            <Button>Back to billing</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--red)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Billing</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Cancel subscription</h2>
        </div>
        <Link to="/settings/billing" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>
            ← Back
          </Button>
        </Link>
      </div>

      <div style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
        padding: isMobile ? 20 : 28, maxWidth: 560,
      }}>
        <div style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 10, background: 'var(--amber-soft)', border: '1px solid var(--amber)', marginBottom: 20, fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Your access will continue</strong> — you&apos;ll have full access to <strong>{planName}</strong> features until{' '}
            {periodEnd ? new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the end of your billing period'}.
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '0 0 20px' }}>
          After cancellation, you will lose access to {planName} features and limits.
          Your data will be preserved in read-only mode for a period of time.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>
            Reason for cancelling (optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Help us improve — tell us why you're leaving..."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)',
              background: 'var(--paper)', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-soft)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/settings/billing" style={{ textDecoration: 'none' }}>
            <Button variant="ghost">Keep subscription</Button>
          </Link>
          <Button
            variant="danger"
            onClick={handleCancel}
            isLoading={busy}
          >
            Confirm cancellation
          </Button>
        </div>
      </div>
    </div>
  );
}
