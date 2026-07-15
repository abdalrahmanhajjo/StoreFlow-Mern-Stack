import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/axios';
import { errorMessage } from '@/lib/http/errors';
import { Logo, Button } from '@/components/ui';

interface DemoSession {
  sessionId: string;
  status: string;
  plan: { name: string; code: string };
  billingInterval: 'monthly' | 'yearly';
  currency: string;
  amountMinor: number;
}

/**
 * Simulated hosted checkout, used only when the backend runs the mock billing
 * provider (no Stripe keys). "Paying" here drives the real backend webhook
 * pipeline — the browser never activates anything itself. With real Stripe
 * keys configured, users are sent to Stripe Checkout and never see this page.
 */
export default function DemoCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<DemoSession | null>(null);
  const [loadError, setLoadError] = useState('');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  const [card, setCard] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12 / 34');
  const [cvc, setCvc] = useState('123');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setLoadError('Missing checkout session. Start again from the pricing page.');
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/v1/billing/demo/checkout-sessions/${sessionId}`);
        const data = res.data?.data as DemoSession;
        if (data.status !== 'pending') {
          navigate(`/billing/checkout/complete?session_id=${sessionId}`, { replace: true });
          return;
        }
        setSession(data);
      } catch {
        setLoadError('This checkout session could not be found or has expired.');
      }
    })();
  }, [sessionId, navigate]);

  const amount = session ? `$${(session.amountMinor / 100).toFixed(2)}` : '';
  const intervalLabel = session?.billingInterval === 'yearly' ? 'year' : 'month';

  async function handlePay() {
    if (!sessionId || paying) return;
    setPaying(true);
    setPayError('');
    try {
      // The card is simulated but validated and stored as the account's
      // payment method — exactly what a real checkout completion does.
      await api.post(`/v1/billing/demo/checkout-sessions/${sessionId}/pay`, {
        cardNumber: card,
        expiry,
      });
      navigate(`/billing/checkout/complete?session_id=${sessionId}`);
    } catch (e) {
      setPayError(errorMessage(e, 'The simulated payment failed. Please try again.'));
      setPaying(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 14, color: 'var(--ink)',
    background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8,
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: 'var(--card)', borderRadius: 20,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '36px 36px 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={26} />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>StoreFlow</span>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            color: 'var(--amber-deep)', background: 'var(--amber-soft)',
            padding: '4px 10px', borderRadius: 999,
          }}>
            Test mode
          </span>
        </div>

        {loadError && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '8px 0 20px' }}>{loadError}</p>
            <Link to="/pricing" style={{ textDecoration: 'none' }}>
              <Button variant="primary" fullWidth>Back to pricing</Button>
            </Link>
          </div>
        )}

        {!loadError && !session && (
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '20px 0' }}>Loading checkout…</p>
        )}

        {session && (
          <>
            <div style={{
              background: 'var(--paper)', border: '1px solid var(--line-soft)',
              borderRadius: 12, padding: '14px 16px', marginBottom: 22,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                  {session.plan.name} plan
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{amount}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>
                Billed every {intervalLabel} · renews automatically · cancel anytime
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="demo-card">Card number</label>
              <input id="demo-card" style={inputStyle} value={card}
                onChange={(e) => setCard(e.target.value)} autoComplete="off" inputMode="numeric" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle} htmlFor="demo-expiry">Expiry</label>
                <input id="demo-expiry" style={inputStyle} value={expiry}
                  onChange={(e) => setExpiry(e.target.value)} autoComplete="off" inputMode="numeric" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle} htmlFor="demo-cvc">CVC</label>
                <input id="demo-cvc" style={inputStyle} value={cvc}
                  onChange={(e) => setCvc(e.target.value)} autoComplete="off" inputMode="numeric" />
              </div>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={labelStyle} htmlFor="demo-name">Name on card</label>
              <input id="demo-name" style={inputStyle} value={name} placeholder="Jane Smith"
                onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>

            {payError && (
              <p role="alert" style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 14px' }}>{payError}</p>
            )}

            <Button variant="primary" fullWidth disabled={paying} onClick={handlePay}>
              {paying ? 'Processing…' : `Pay ${amount}`}
            </Button>

            <p style={{ fontSize: 12, color: 'var(--ink-soft)', textAlign: 'center', margin: '14px 0 0', lineHeight: 1.5 }}>
              Simulated payment — no real card is charged. With Stripe keys
              configured this step happens on Stripe&apos;s secure checkout.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
