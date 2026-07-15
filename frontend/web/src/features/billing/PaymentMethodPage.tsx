import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, toast } from '@/components/ui';
import { errorMessage } from '@/lib/http/errors';
import { billingService, type PaymentMethodInfo } from './billingService';

/**
 * In-app payment method management. Used with the mock billing provider —
 * with real Stripe keys configured, the "Payment method" button opens the
 * hosted Stripe billing portal instead and this page is never reached.
 */
export default function PaymentMethodPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethodInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');

  useEffect(() => {
    billingService.getPaymentMethod()
      .then((m) => { setMethod(m); setEditing(!m); })
      .catch(() => toast.error('Could not load payment method'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await billingService.updatePaymentMethod(cardNumber, expiry);
      setMethod(updated);
      setEditing(false);
      setCardNumber('');
      setExpiry('');
      toast.success('Payment method updated');
    } catch (e) {
      toast.error(errorMessage(e, 'Could not update payment method'));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 12px', fontSize: 14, color: 'var(--ink)',
    background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 9,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6,
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Payment method</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>
            The card charged for your subscription
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/settings/billing')} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>
          ← Billing
        </Button>
      </div>

      <div style={{ maxWidth: 480 }}>
        {loading ? (
          <div style={{ height: 140, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--line-soft)' }} />
        ) : (
          <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16, padding: isMobile ? 20 : 24 }}>
            {method && !editing && (
              <>
                {/* Card on file */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 16,
                  borderRadius: 12, border: '1px solid var(--line)', background: 'var(--paper)',
                  marginBottom: 16,
                }}>
                  <div style={{
                    width: 46, height: 32, borderRadius: 6, background: 'var(--ink)',
                    color: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
                  }}>
                    {method.brand.toUpperCase().slice(0, 4)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>
                      {method.brand} •••• {method.last4}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
                      Expires {String(method.expMonth).padStart(2, '0')}/{String(method.expYear).slice(-2)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                    background: 'var(--green-soft)', color: 'var(--green-deep)',
                  }}>
                    Default
                  </span>
                </div>
                <Button onClick={() => setEditing(true)} fullWidth style={{ justifyContent: 'center' }}>
                  Replace card
                </Button>
              </>
            )}

            {editing && (
              <>
                {!method && (
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
                    No card on file yet. Add one below — it will be used for future
                    plan payments.
                  </p>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle} htmlFor="pm-card">Card number</label>
                  <input id="pm-card" style={inputStyle} value={cardNumber} placeholder="4242 4242 4242 4242"
                    onChange={(e) => setCardNumber(e.target.value)} autoComplete="off" inputMode="numeric" />
                </div>
                <div style={{ marginBottom: 18, maxWidth: 160 }}>
                  <label style={labelStyle} htmlFor="pm-expiry">Expiry (MM/YY)</label>
                  <input id="pm-expiry" style={inputStyle} value={expiry} placeholder="12/34"
                    onChange={(e) => setExpiry(e.target.value)} autoComplete="off" inputMode="numeric" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {method && (
                    <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                      Cancel
                    </Button>
                  )}
                  <Button onClick={save} isLoading={saving} style={{ flex: 2, justifyContent: 'center' }}>
                    Save card
                  </Button>
                </div>
              </>
            )}

            <div style={{
              marginTop: 16, padding: '10px 12px', borderRadius: 9, fontSize: 11.5,
              background: 'var(--blue-soft)', color: 'var(--blue)', lineHeight: 1.5,
            }}>
              Demo billing — cards are simulated and never charged. Only the brand,
              last four digits and expiry are stored.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
