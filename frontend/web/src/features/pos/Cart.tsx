import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, useCartTotals, maxPctForRole, maxFixedForRole, TAX_RATE } from './cartStore';
import { useParkedSales } from './parkedSalesStore';
import { completeSale } from './checkout';
import { useCustomers } from '@/features/customers/customersStore';
import { useSession } from '@/store/session';
import { POINTS_BLOCK } from '@/features/customers/loyalty';
import { money, points as fmtPoints } from '@/lib/format';
import { ProductThumb, Modal, Spinner, toast, tierFor, TierBadge } from '@/components/ui';
import { CustomerSearch } from './CustomerSearch';

export function Cart() {
  const navigate = useNavigate();
  const cashier = useSession((s) => s.user?.name ?? 'Cashier');
  const role = useSession((s) => s.user?.role ?? null);
  const { items, payMethod, customer, redeeming, discountMode, discountRate, discountFixed, changeQty, remove, setPay, setCustomer, toggleRedeem, setDiscountMode, setDiscountRate, setDiscountFixed, reset } = useCart();
  const t = useCartTotals();
  const { parked, park, resume, remove: removeParked } = useParkedSales();
  const [parkedOpen, setParkedOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState(0);
  const [confirmPay, setConfirmPay] = useState<'Cash' | 'Card' | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const payTimer = useRef<ReturnType<typeof setTimeout>>();

  const onSelectCustomer = (c: { id: string; name: string; points: number }) => setCustomer({ id: c.id, name: c.name, points: c.points });
  const onCreateCustomer = (name: string) => {
    const c = useCustomers.getState().create(name);
    setCustomer({ id: c.id, name: c.name, points: c.points });
    toast(`New customer “${c.name}” created`);
  };
  const customerTier = customer ? tierFor(customer.points) : null;

  const onRedeem = () => {
    if (!customer) return toast('Select a customer first');
    if (customer.points < POINTS_BLOCK) return toast(`Needs at least ${POINTS_BLOCK} points to redeem`);
    toggleRedeem();
  };

  const finishSale = useCallback(async () => {
    const res = await completeSale(cashier);
    if (!res.ok) { return toast(res.error); }
    toast(`Sale ${res.sale.invoiceNo} · ${money(res.sale.total)} by ${res.sale.payment}` + (res.sale.customerName ? ` · +${res.sale.pointsEarned} pts` : ''));
    navigate(`/sales/${res.sale.invoiceNo}/receipt`);
  }, [cashier, navigate]);

  const onCheckout = () => {
    setPayStep(0);
    setPayOpen(true);
  };

  const startProcessing = () => {
    setPayStep(1);
    payTimer.current = setTimeout(() => {
      setPayStep(2);
      payTimer.current = setTimeout(() => {
        setPayOpen(false);
        finishSale();
      }, 1200);
    }, 1800);
  };

  const onCancelPay = () => {
    if (payStep > 0) return;
    clearTimeout(payTimer.current);
    setPayOpen(false);
    setPayStep(0);
  };

  const proceedPay = () => {
    const method = confirmPay;
    setConfirmPay(null);
    if (method === 'Cash') finishSale();
    else if (method === 'Card') onCheckout();
  };

  const onHold = () => {
    if (!items.length) return toast('Nothing to hold');
    const itemCount = items.reduce((s, i) => s + i.qty, 0);
    const r = park({ label: `${itemCount} item${itemCount > 1 ? 's' : ''} · ${money(t.subtotal)}`, items: items.map((i) => ({ ...i })), customer: customer ? { ...customer } : null, discountMode, discountRate, discountFixed, payMethod, cashier, itemCount, total: t.total });
    if (!r.ok) return toast(r.error);
    reset();
    toast('Sale parked');
  };

  const onResume = (id: number) => {
    const p = resume(id);
    if (!p) return;
    useCart.setState({ items: p.items, customer: p.customer, discountMode: p.discountMode, discountRate: p.discountRate, discountFixed: p.discountFixed, payMethod: p.payMethod, redeeming: false });
    toast('Parked sale resumed');
  };

  const empty = !items.length;
  const parkedCount = parked.length;

  return (
    <>
      <div style={{ background: 'var(--card)', color: 'var(--ink)', display: 'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100%', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '.01em' }}>Sale</strong>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600 }}>{cashier}</span>
        </div>

        {/* Customer */}
        <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid var(--line)' }}>
          <CustomerSearch onSelect={onSelectCustomer} onCreate={onCreateCustomer} />
          {customer && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TierBadge tier={customerTier!} />
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>{fmtPoints(customer.points)} pts</span>
              </div>
              <button type="button" onClick={onRedeem} disabled={customer.points < POINTS_BLOCK} style={{ padding: '5px 14px', borderRadius: 7, border: '1px solid var(--blue-border)', background: redeeming ? 'var(--blue)' : 'var(--blue-soft)', color: redeeming ? 'var(--card)' : 'var(--blue-deep)', fontSize: 12, fontWeight: 700, cursor: customer.points < POINTS_BLOCK ? 'not-allowed' : 'pointer', opacity: customer.points < POINTS_BLOCK ? 0.5 : 1, transition: 'all .12s' }}>
                {redeeming ? 'Redeeming' : 'Redeem'}
              </button>
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ overflow: 'auto', minHeight: 0 }}>
          {empty ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.15 }}>🧾</div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 14, fontWeight: 600 }}>Sale is empty</div>
              <div style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 4, opacity: 0.7 }}>Tap a product to add items</div>
              {parkedCount > 0 && (
                <button type="button" onClick={() => setParkedOpen(true)} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--paper)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)' }}>
                  ⏸ {parkedCount} parked sale{parkedCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Table Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--card-raise)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Product</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'center', minWidth: 40 }}>Qty</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'right', minWidth: 60 }}>Price</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'right', minWidth: 70 }}>Total</span>
                <span style={{ fontSize: 11, width: 28 }}></span>
              </div>

              {/* Items */}
              {items.map((i) => (
                <div key={i.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 8, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--line-soft)', transition: 'background .1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-raise)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Product Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <ProductThumb src={i.image} emoji={i.emoji} alt={i.name} size={36} radius={6} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>{i.sku}</div>
                    </div>
                  </div>

                  {/* Qty Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 40, justifyContent: 'center' }}>
                    <button type="button" onClick={() => changeQty(i.id, -1)} aria-label="Decrease" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, width: 20, height: 20, borderRadius: 4, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{i.qty}</span>
                    <button type="button" onClick={() => changeQty(i.id, 1)} aria-label="Increase" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, width: 20, height: 20, borderRadius: 4, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                  </div>

                  {/* Price */}
                  <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', minWidth: 60, textAlign: 'right' }}>{money(i.price)}</div>

                  {/* Total */}
                  <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', minWidth: 70, textAlign: 'right' }}>{money(i.price * i.qty)}</div>

                  {/* Remove */}
                  <button type="button" onClick={() => remove(i.id)} aria-label="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', width: 24, height: 24, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-faint)', fontSize: 11, flexShrink: 0, padding: 0, transition: 'color .1s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-faint)'}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + checkout */}
        {!empty && (
            <div style={{ padding: '12px 20px 14px', borderTop: '1px solid var(--line)', background: 'var(--card-raise)' }}>
              {/* Discount */}
              <button type="button" onClick={() => setDiscountOpen(!discountOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px 8px 0', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 8, color: 'var(--ink-soft)', fontSize: 12, fontWeight: 600, transition: 'background .1s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {((discountMode === 'percent' ? discountRate : discountFixed) > 0) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink)' }} />}
                  Discount
                  {(discountMode === 'percent' ? discountRate > 0 : discountFixed > 0) && (
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>−{money(t.discount)}</span>
                  )}
                </div>
                <span style={{ fontSize: 12, transition: 'transform .2s', display: 'inline-block', transform: discountOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>

              {discountOpen && (
                <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line)', padding: '12px 14px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Adjust discount</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>cap {discountMode === 'percent' ? `${Math.round(maxPctForRole(role) * 100)}%` : money(maxFixedForRole(role))}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'var(--paper-dim)', borderRadius: 7, overflow: 'hidden', fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
                      <button type="button" onClick={() => setDiscountMode('percent')} style={{ padding: '5px 13px', border: 'none', cursor: 'pointer', background: discountMode === 'percent' ? 'var(--ink)' : 'transparent', color: discountMode === 'percent' ? 'var(--card)' : 'var(--ink-soft)', transition: 'all .12s' }}>%</button>
                      <button type="button" onClick={() => setDiscountMode('fixed')} style={{ padding: '5px 13px', border: 'none', cursor: 'pointer', background: discountMode === 'fixed' ? 'var(--ink)' : 'transparent', color: discountMode === 'fixed' ? 'var(--card)' : 'var(--ink-soft)', transition: 'all .12s' }}>$</button>
                    </div>
                    {discountMode === 'percent' ? (
                      <>
                        <input type="range" min={0} max={maxPctForRole(role) * 100} value={discountRate * 100} onChange={(e) => setDiscountRate(Number(e.target.value) / 100, role)} style={{ flex: 1, accentColor: 'var(--ink)' }} aria-label="Discount percent" />
                        <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', minWidth: 36, textAlign: 'right' }}>{Math.round(discountRate * 100)}%</span>
                      </>
                    ) : (
                      <>
                        <input type="range" min={0} max={maxFixedForRole(role)} value={discountFixed} onChange={(e) => setDiscountFixed(Number(e.target.value), role)} style={{ flex: 1, accentColor: 'var(--ink)' }} aria-label="Discount amount" />
                        <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', minWidth: 48, textAlign: 'right' }}>{money(discountFixed)}</span>
                      </>
                    )}
                    {(discountMode === 'percent' && discountRate > 0) || (discountMode === 'fixed' && discountFixed > 0) ? (
                      <button type="button" onClick={() => discountMode === 'percent' ? setDiscountRate(0, role) : setDiscountFixed(0, role)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-faint)', flexShrink: 0, padding: 4 }}>✕</button>
                    ) : null}
                  </div>
                  {(discountMode === 'percent' ? discountRate > 0 : discountFixed > 0) && (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>You save</span>
                      <span className="mono" style={{ fontWeight: 800, fontSize: 12 }}>{money(t.discount)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Summary Table */}
              <div style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line)', padding: '10px 14px', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Add</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Discount</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Promo</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '.04em', textTransform: 'uppercase' }}>Tax</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{items.length} items</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{money(t.discount)}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{t.redeemPoints} pts</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{money(t.tax)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>TAX GST {Math.round(TAX_RATE * 100)}%</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>−{money(t.redeem)}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>−{money(t.discount)}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{money(t.tax)}</span>
                </div>
              </div>

              {/* Payment Button */}
              <button type="button" onClick={() => { setPay(payMethod); setConfirmPay(payMethod); }} style={{ width: '100%', padding: '16px 20px', borderRadius: 10, border: 'none', background: 'var(--ink)', color: 'var(--card)', fontSize: 14, fontWeight: 600, letterSpacing: '.04em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all .12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--blue-deep)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ink)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span>PAY {items.reduce((s, i) => s + i.qty, 0)} ITEMS</span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 800 }}>{money(t.total)}</span>
              </button>

              {customer && (
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700, textAlign: 'center', marginTop: 10 }}>★ {customer.name.split(' ')[0]} earns {t.pointsEarned} pts</div>
              )}

              {/* Hold + Quick Actions */}
              <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                <button type="button" onClick={onHold} style={{ flex: 1, background: 'var(--card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', padding: 10, borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.borderColor = 'var(--blue-border)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
                >⏸ Hold</button>
                <button type="button" onClick={() => { setPay('Cash'); setConfirmPay('Cash'); }} style={{ flex: 1, background: 'var(--card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', padding: 10, borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all .1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-dim)'; e.currentTarget.style.borderColor = 'var(--ink)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
                >💵 Cash</button>
                <button type="button" onClick={() => { setPay('Card'); setConfirmPay('Card'); }} style={{ flex: 1, background: 'var(--card)', color: 'var(--ink-soft)', border: '1px solid var(--line)', padding: 10, borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all .1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-dim)'; e.currentTarget.style.borderColor = 'var(--ink)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
                >💳 Card</button>
              </div>

              {parkedCount > 0 && (
                <button type="button" onClick={() => setParkedOpen(true)} style={{ marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 6, border: 'none', background: 'none', fontSize: 11, color: 'var(--ink-faint)', cursor: 'pointer' }}>
                  ⏸ {parkedCount} parked sale{parkedCount > 1 ? 's' : ''}
                </button>
              )}
          </div>
        )}
      </div>

      {/* Card terminal modal */}
      <Modal open={payOpen} onClose={onCancelPay}>
        <div style={{ background: 'var(--shell-raise)', borderRadius: 14, padding: 0, overflow: 'hidden', margin: -22 }}>
          {/* Terminal screen */}
          <div style={{ background: 'var(--ink)', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: 'var(--green-vivid)', fontSize: 8 }}>●</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, letterSpacing: '.04em' }}>Secure Terminal</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'monospace' }}>RF-01</span>
          </div>

          {payStep === 0 && (
            <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }}>💳</div>
              <div style={{ color: 'var(--shell-text)', fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Insert or tap card</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 20 }}>Visa · Mastercard · American Express</div>
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Amount due</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--shell-text)', fontFamily: 'monospace' }}>{money(t.total)}</div>
              </div>
              <button type="button" onClick={startProcessing} style={{ width: '100%', padding: '13px 0', borderRadius: 9, border: 'none', background: '#f4f4f1', color: '#111110', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Process payment</button>
              <button type="button" onClick={onCancelPay} style={{ width: '100%', padding: '10px 0', borderRadius: 9, border: 'none', background: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer', marginTop: 6 }}>Cancel</button>
            </div>
          )}

          {payStep === 1 && (
            <div style={{ padding: '36px 24px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 14, lineHeight: 1 }}>💳</div>
              <Spinner size="lg" color="#fff" />
              <div style={{ color: 'var(--shell-text)', fontSize: 14, fontWeight: 600, marginTop: 16 }}>Authorizing transaction…</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>Please wait while the payment is processed</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--shell-text)', fontFamily: 'monospace', marginTop: 16 }}>{money(t.total)}</div>
            </div>
          )}

          {payStep === 2 && (
            <div style={{ padding: '36px 24px 28px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-vivid)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26 }}>✓</div>
              <div style={{ color: 'var(--green-vivid)', fontSize: 15, fontWeight: 700, letterSpacing: '.04em' }}>APPROVED</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--shell-text)', fontFamily: 'monospace', margin: '10px 0' }}>{money(t.total)}</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Transaction completed successfully</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                <span>AUTH: 4E8B2F</span>
                <span>REF: {String(Date.now()).slice(-8)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={parkedOpen} onClose={() => setParkedOpen(false)} title="Parked sales">
        {parked.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>No parked sales.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {parked.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--paper)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>{new Date(p.parkedAt).toLocaleString()} · {p.cashier}{p.customer && ` · ${p.customer.name}`}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button type="button" onClick={() => { onResume(p.id); setParkedOpen(false); }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--blue-border)', background: 'var(--blue-soft)', color: 'var(--blue-deep)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Resume</button>
                  <button type="button" onClick={() => removeParked(p.id)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-faint)', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Payment confirmation */}
      <Modal open={!!confirmPay} onClose={() => setConfirmPay(null)}>
        <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
          <div style={{ fontSize: 40, marginBottom: 10, lineHeight: 1 }}>{confirmPay === 'Cash' ? '💵' : '💳'}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
            {confirmPay === 'Cash' ? 'Pay with Cash' : 'Pay with Card'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 12 }}>
            {confirmPay === 'Cash' ? 'This will complete the sale immediately' : 'Open card terminal to process payment'}
          </div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', marginBottom: 18, padding: '8px 0', borderTop: '2px solid var(--ink)', borderBottom: '1px solid var(--line)' }}>
            {money(t.total)}
          </div>
          {customer && (
            <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginBottom: 12 }}>★ {customer.name.split(' ')[0]} earns {t.pointsEarned} pts</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setConfirmPay(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="button" onClick={proceedPay} style={{ flex: 2, padding: '11px 0', borderRadius: 9, border: 'none', background: 'var(--ink)', color: 'var(--card)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {confirmPay === 'Cash' ? `Collect ${money(t.total)}` : `Charge ${money(t.total)}`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
