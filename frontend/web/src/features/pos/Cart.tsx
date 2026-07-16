import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, useCartTotals, maxPctForRole, maxFixedForRole } from './cartStore';
import { useParkedSales } from './parkedSalesStore';
import { completeSale } from './checkout';
import { useCustomers } from '@/features/customers/customersStore';
import { useSession } from '@/store/session';
import { POINTS_BLOCK } from '@/features/customers/loyalty';
import { money, points as fmtPoints } from '@/lib/format';
import { ProductThumb, Modal, Spinner, toast, tierFor, TierBadge } from '@/components/ui';
import { CustomerSearch } from './CustomerSearch';

type PosCustomer = {
  id: string;
  name: string;
  phone?: string;
  points: number;
};

export function Cart() {
  const navigate = useNavigate();
  const cashier = useSession((s) => s.user?.name ?? 'Cashier');
  const role = useSession((s) => s.user?.role ?? null);

  const {
    items,
    payMethod,
    customer,
    redeeming,
    discountMode,
    discountRate,
    discountFixed,
    changeQty,
    remove,
    setPay,
    setCustomer,
    toggleRedeem,
    setDiscountMode,
    setDiscountRate,
    setDiscountFixed,
    reset,
  } = useCart();

  const taxRate = useCart((s) => s.taxRate);
  const t = useCartTotals();
  const { parked, park, resume, remove: removeParked } = useParkedSales();

  const [parkedOpen, setParkedOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payStep, setPayStep] = useState(0);
  const [confirmPay, setConfirmPay] = useState<'Cash' | 'Card' | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [payRef, setPayRef] = useState('');

  const payTimer = useRef<ReturnType<typeof setTimeout>>();

  const onSelectCustomer = (c: PosCustomer) => {
    setCustomer({
      id: c.id,
      name: c.name,
      phone: c.phone ?? '',
      points: c.points,
    });
  };

  const onCreateCustomer = (name: string, phone?: string) => {
    const c = useCustomers.getState().create(name, phone);

    setCustomer({
      id: c.id,
      name: c.name,
      phone: c.phone ?? '',
      points: c.points,
    });

    toast(`New customer “${c.name}” created`);
  };

  const customerTier = customer ? tierFor(customer.points) : null;
  const customerPhone = customer?.phone ?? '';
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const empty = !items.length;
  const parkedCount = parked.length;

  const onRedeem = () => {
    if (!customer) return toast('Select a customer first');

    if (customer.points < POINTS_BLOCK) {
      return toast(`Needs at least ${POINTS_BLOCK} points to redeem`);
    }

    toggleRedeem();
  };

  const finishSale = useCallback(async () => {
    const res = await completeSale(cashier);

    if (!res.ok) {
      return toast(res.error);
    }

    toast(
      `Sale ${res.sale.invoiceNo} · ${money(res.sale.total)} by ${res.sale.payment}` +
      (res.sale.customerName ? ` · +${res.sale.pointsEarned} pts` : '')
    );

    navigate(`/sales/${res.sale.invoiceNo}/receipt`);
  }, [cashier, navigate]);

  const onCheckout = () => {
    setPayStep(0);
    setPayOpen(true);
  };

  const startProcessing = () => {
    setPayRef(String(Date.now()).slice(-8));
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

    const r = park({
      label: `${itemCount} item${itemCount > 1 ? 's' : ''} · ${money(t.subtotal)}`,
      items: items.map((i) => ({ ...i })),
      customer: customer ? { ...customer } : null,
      discountMode,
      discountRate,
      discountFixed,
      payMethod,
      cashier,
      itemCount,
      total: t.total,
    });

    if (!r.ok) return toast(r.error);

    reset();
    toast('Sale parked');
  };

  const onResume = (id: number) => {
    const p = resume(id);

    if (!p) return;

    useCart.setState({
      items: p.items,
      customer: p.customer,
      discountMode: p.discountMode,
      discountRate: p.discountRate,
      discountFixed: p.discountFixed,
      payMethod: p.payMethod,
      redeeming: false,
    });

    toast('Parked sale resumed');
  };

  return (
    <>
      <div
        style={{
          background: 'var(--card)',
          color: 'var(--ink)',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          borderLeft: '1px solid var(--line)',
        }}
      >
        {/* Modern Sale Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'linear-gradient(180deg, var(--card) 0%, var(--card-raise) 100%)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: 'var(--ink)',
                  letterSpacing: '-.02em',
                }}
              >
                Sale
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                  fontWeight: 700,
                  marginTop: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                Register RF-01
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--ink)',
                }}
              >
                {cashier}
              </div>

              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                  marginTop: 3,
                }}
              >
                {new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Customer Card */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--line)',
            background: 'var(--card)',
          }}
        >
          <CustomerSearch onSelect={onSelectCustomer} onCreate={onCreateCustomer} />

          {customer ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                border: '1px solid var(--line)',
                background: 'var(--card-raise)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  title={customer.name}
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 190,
                    textTransform: 'capitalize',
                  }}
                >
                  {customer.name}
                </div>

                <div
                  className="mono"
                  title={customerPhone || 'No phone number'}
                  style={{
                    fontSize: 11.5,
                    color: 'var(--ink-faint)',
                    fontWeight: 600,
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 190,
                  }}
                >
                  {customerPhone || 'No phone number'}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <TierBadge tier={customerTier!} />

                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: 'var(--ink-soft)',
                      fontWeight: 800,
                    }}
                  >
                    {fmtPoints(customer.points)} pts
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onRedeem}
                disabled={customer.points < POINTS_BLOCK}
                style={{
                  padding: '7px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--blue-border)',
                  background: redeeming ? 'var(--blue)' : 'var(--blue-soft)',
                  color: redeeming ? 'var(--card)' : 'var(--blue-deep)',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: customer.points < POINTS_BLOCK ? 'not-allowed' : 'pointer',
                  opacity: customer.points < POINTS_BLOCK ? 0.5 : 1,
                  transition: 'all .12s',
                  flexShrink: 0,
                }}
              >
                {redeeming ? 'Redeeming' : 'Redeem'}
              </button>
            </div>
          ) : (
            <div
              style={{
                marginTop: 10,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--paper)',
                border: '1px dashed var(--line)',
                color: 'var(--ink-faint)',
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              Select a customer to track points and phone details
            </div>
          )}
        </div>

        {/* Modern Items Area */}
        <div style={{ padding: empty ? 0 : '14px 20px' }}>
          {empty ? (
            <div style={{ padding: '64px 20px', textAlign: 'center' }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 18,
                  background: 'var(--paper)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  fontSize: 28,
                }}
              >
                🧾
              </div>

              <div style={{ color: 'var(--ink)', fontSize: 15, fontWeight: 900 }}>
                Sale is empty
              </div>

              <div
                style={{
                  color: 'var(--ink-faint)',
                  fontSize: 12,
                  marginTop: 5,
                  fontWeight: 600,
                }}
              >
                Tap a product to add it here
              </div>

              {parkedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setParkedOpen(true)}
                  style={{
                    marginTop: 18,
                    padding: '9px 18px',
                    borderRadius: 999,
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: 'var(--ink-soft)',
                  }}
                >
                  ⏸ {parkedCount} parked sale{parkedCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-faint)',
                    fontWeight: 900,
                    letterSpacing: '.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  Cart items
                </span>

                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-soft)',
                    fontWeight: 800,
                  }}
                >
                  {totalQty} item{totalQty > 1 ? 's' : ''}
                </span>
              </div>

              {items.map((i) => (
                <div
                  key={i.id}
                  style={{
                    borderRadius: 16,
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    padding: 12,
                    boxShadow: '0 1px 0 rgba(0,0,0,.03)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                      <ProductThumb src={i.image} emoji={i.emoji} alt={i.name} size={38} radius={10} />

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 900,
                            color: 'var(--ink)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 160,
                          }}
                        >
                          {i.name}
                        </div>

                        <div
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: 'var(--ink-faint)',
                            fontWeight: 600,
                            marginTop: 2,
                          }}
                        >
                          SKU {i.sku}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(i.id)}
                      aria-label="Remove"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 9,
                        border: '1px solid var(--line)',
                        background: 'var(--card-raise)',
                        color: 'var(--ink-faint)',
                        cursor: 'pointer',
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        background: 'var(--paper)',
                        borderRadius: 10,
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-faint)',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          marginBottom: 3,
                        }}
                      >
                        Unit price
                      </div>

                      <div
                        className="mono"
                        style={{
                          fontSize: 13,
                          color: 'var(--ink)',
                          fontWeight: 900,
                        }}
                      >
                        {money(i.price)}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'var(--paper)',
                        borderRadius: 10,
                        padding: '8px 10px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--ink-faint)',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          marginBottom: 3,
                        }}
                      >
                        Line total
                      </div>

                      <div
                        className="mono"
                        style={{
                          fontSize: 13,
                          color: 'var(--ink)',
                          fontWeight: 900,
                        }}
                      >
                        {money(i.price * i.qty)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--ink-faint)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      Quantity
                    </span>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        background: 'var(--paper)',
                        border: '1px solid var(--line)',
                        borderRadius: 999,
                        padding: '4px 6px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => changeQty(i.id, -1)}
                        aria-label="Decrease"
                        style={{
                          border: 'none',
                          background: 'var(--card)',
                          cursor: 'pointer',
                          fontSize: 15,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          color: 'var(--ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          fontWeight: 900,
                        }}
                      >
                        −
                      </button>

                      <span
                        className="mono"
                        style={{
                          fontSize: 13,
                          color: 'var(--ink)',
                          fontWeight: 900,
                          minWidth: 20,
                          textAlign: 'center',
                        }}
                      >
                        {i.qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => changeQty(i.id, 1)}
                        aria-label="Increase"
                        style={{
                          border: 'none',
                          background: 'var(--ink)',
                          cursor: 'pointer',
                          fontSize: 15,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          color: 'var(--card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          fontWeight: 900,
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modern Summary + Checkout */}
        {!empty && (
          <div
            style={{
              padding: '14px 20px 18px',
              borderTop: '1px solid var(--line)',
              background: 'linear-gradient(180deg, var(--card-raise) 0%, var(--card) 100%)',
            }}
          >
            <button
              type="button"
              onClick={() => setDiscountOpen(!discountOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--ink)',
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <span>Discount</span>
              <span
                style={{
                  transform: discountOpen ? 'rotate(180deg)' : 'none',
                  transition: '.2s',
                }}
              >
                ▾
              </span>
            </button>

            {discountOpen && (
              <div
                style={{
                  background: 'var(--card)',
                  borderRadius: 14,
                  border: '1px solid var(--line)',
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: 'var(--ink-soft)',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                    }}
                  >
                    Adjust discount
                  </span>

                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--ink-faint)',
                      fontWeight: 700,
                    }}
                  >
                    cap{' '}
                    {discountMode === 'percent'
                      ? `${Math.round(maxPctForRole(role) * 100)}%`
                      : money(maxFixedForRole(role))}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      background: 'var(--paper)',
                      borderRadius: 10,
                      overflow: 'hidden',
                      fontSize: 12,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setDiscountMode('percent')}
                      style={{
                        padding: '7px 14px',
                        border: 'none',
                        cursor: 'pointer',
                        background: discountMode === 'percent' ? 'var(--ink)' : 'transparent',
                        color: discountMode === 'percent' ? 'var(--card)' : 'var(--ink-soft)',
                      }}
                    >
                      %
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiscountMode('fixed')}
                      style={{
                        padding: '7px 14px',
                        border: 'none',
                        cursor: 'pointer',
                        background: discountMode === 'fixed' ? 'var(--ink)' : 'transparent',
                        color: discountMode === 'fixed' ? 'var(--card)' : 'var(--ink-soft)',
                      }}
                    >
                      $
                    </button>
                  </div>

                  {discountMode === 'percent' ? (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={maxPctForRole(role) * 100}
                        value={discountRate * 100}
                        onChange={(e) => setDiscountRate(Number(e.target.value) / 100, role)}
                        style={{ flex: 1, accentColor: 'var(--ink)' }}
                        aria-label="Discount percent"
                      />

                      <span
                        className="mono"
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          minWidth: 38,
                          textAlign: 'right',
                        }}
                      >
                        {Math.round(discountRate * 100)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={maxFixedForRole(role)}
                        value={discountFixed}
                        onChange={(e) => setDiscountFixed(Number(e.target.value), role)}
                        style={{ flex: 1, accentColor: 'var(--ink)' }}
                        aria-label="Discount amount"
                      />

                      <span
                        className="mono"
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          minWidth: 50,
                          textAlign: 'right',
                        }}
                      >
                        {money(discountFixed)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700 }}>Subtotal</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 900 }}>
                  {money(t.subtotal)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700 }}>Discount</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 900 }}>
                  −{money(t.discount)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700 }}>Redeemed</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--green)', fontWeight: 900 }}>
                  −{money(t.redeem)} · {t.redeemPoints} pts
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700 }}>
                  Tax {Math.round(taxRate * 1000) / 10}%
                </span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 900 }}>
                  {money(t.tax)}
                </span>
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 900 }}>Total</span>
                <span className="mono" style={{ fontSize: 18, color: 'var(--ink)', fontWeight: 900 }}>
                  {money(t.total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPay(payMethod);
                setConfirmPay(payMethod);
              }}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 14,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--card)',
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: '.03em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 10px 22px rgba(0,0,0,.14)',
              }}
            >
              <span>
                PAY {totalQty} ITEM{totalQty > 1 ? 'S' : ''}
              </span>
              <span className="mono" style={{ fontSize: 19, fontWeight: 900 }}>
                {money(t.total)}
              </span>
            </button>

            {customer && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--green)',
                  fontWeight: 900,
                  textAlign: 'center',
                  marginTop: 11,
                }}
              >
                ★ {customer.name.split(' ')[0]} earns {t.pointsEarned} pts
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
              <button
                type="button"
                onClick={onHold}
                style={{
                  flex: 1,
                  background: 'var(--card)',
                  color: 'var(--ink-soft)',
                  border: '1px solid var(--line)',
                  padding: 10,
                  borderRadius: 11,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                ⏸ Hold
              </button>

              <button
                type="button"
                onClick={() => {
                  setPay('Cash');
                  setConfirmPay('Cash');
                }}
                style={{
                  flex: 1,
                  background: 'var(--card)',
                  color: 'var(--ink-soft)',
                  border: '1px solid var(--line)',
                  padding: 10,
                  borderRadius: 11,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                💵 Cash
              </button>

              <button
                type="button"
                onClick={() => {
                  setPay('Card');
                  setConfirmPay('Card');
                }}
                style={{
                  flex: 1,
                  background: 'var(--card)',
                  color: 'var(--ink-soft)',
                  border: '1px solid var(--line)',
                  padding: 10,
                  borderRadius: 11,
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                💳 Card
              </button>
            </div>

            {parkedCount > 0 && (
              <button
                type="button"
                onClick={() => setParkedOpen(true)}
                style={{
                  marginTop: 9,
                  width: '100%',
                  padding: '7px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: 'none',
                  fontSize: 11,
                  color: 'var(--ink-faint)',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ⏸ {parkedCount} parked sale{parkedCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Card terminal modal */}
      <Modal open={payOpen} onClose={onCancelPay}>
        <div
          style={{
            background: 'var(--shell-raise)',
            borderRadius: 14,
            padding: 0,
            overflow: 'hidden',
            margin: -22,
          }}
        >
          <div
            style={{
              background: 'var(--ink)',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: 'var(--green-vivid)', fontSize: 8 }}>●</span>
              <span
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '.04em',
                }}
              >
                Secure Terminal
              </span>
            </div>
            <span
              style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: 9,
                fontFamily: 'monospace',
              }}
            >
              RF-01
            </span>
          </div>

          {payStep === 0 && (
            <div style={{ padding: '28px 24px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 8, lineHeight: 1 }}>💳</div>

              <div
                style={{
                  color: 'var(--shell-text)',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Insert or tap card
              </div>

              <div
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 12,
                  marginBottom: 20,
                }}
              >
                Visa · Mastercard · American Express
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.35)',
                    marginBottom: 4,
                  }}
                >
                  Amount due
                </div>

                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    color: 'var(--shell-text)',
                    fontFamily: 'monospace',
                  }}
                >
                  {money(t.total)}
                </div>
              </div>

              <button
                type="button"
                onClick={startProcessing}
                style={{
                  width: '100%',
                  padding: '13px 0',
                  borderRadius: 9,
                  border: 'none',
                  background: '#f4f4f1',
                  color: '#111110',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Process payment
              </button>

              <button
                type="button"
                onClick={onCancelPay}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 9,
                  border: 'none',
                  background: 'none',
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 12,
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {payStep === 1 && (
            <div style={{ padding: '36px 24px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 42, marginBottom: 14, lineHeight: 1 }}>💳</div>

              <Spinner size="lg" color="#fff" />

              <div
                style={{
                  color: 'var(--shell-text)',
                  fontSize: 14,
                  fontWeight: 600,
                  marginTop: 16,
                }}
              >
                Authorizing transaction…
              </div>

              <div
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                Please wait while the payment is processed
              </div>

              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--shell-text)',
                  fontFamily: 'monospace',
                  marginTop: 16,
                }}
              >
                {money(t.total)}
              </div>
            </div>
          )}

          {payStep === 2 && (
            <div style={{ padding: '36px 24px 28px', textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--green-vivid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                  fontSize: 26,
                }}
              >
                ✓
              </div>

              <div
                style={{
                  color: 'var(--green-vivid)',
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '.04em',
                }}
              >
                APPROVED
              </div>

              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: 'var(--shell-text)',
                  fontFamily: 'monospace',
                  margin: '10px 0',
                }}
              >
                {money(t.total)}
              </div>

              <div
                style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: 12,
                }}
              >
                Transaction completed successfully
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                  marginTop: 14,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: 'monospace',
                }}
              >
                <span>AUTH: 4E8B2F</span>
                <span>REF: {payRef}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Parked sales modal */}
      <Modal open={parkedOpen} onClose={() => setParkedOpen(false)} title="Parked sales">
        {parked.length === 0 ? (
          <div
            style={{
              padding: '20px 0',
              textAlign: 'center',
              color: 'var(--ink-faint)',
              fontSize: 13,
            }}
          >
            No parked sales.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {parked.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  background: 'var(--paper)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    {p.label}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-faint)',
                      marginTop: 3,
                    }}
                  >
                    {new Date(p.parkedAt).toLocaleString()} · {p.cashier}
                    {p.customer && ` · ${p.customer.name}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      onResume(p.id);
                      setParkedOpen(false);
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--blue-border)',
                      background: 'var(--blue-soft)',
                      color: 'var(--blue-deep)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Resume
                  </button>

                  <button
                    type="button"
                    onClick={() => removeParked(p.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--line)',
                      background: 'var(--card)',
                      color: 'var(--ink-faint)',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Payment confirmation */}
      <Modal open={!!confirmPay} onClose={() => setConfirmPay(null)}>
        <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
          <div style={{ fontSize: 40, marginBottom: 10, lineHeight: 1 }}>
            {confirmPay === 'Cash' ? '💵' : '💳'}
          </div>

          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--ink)',
              marginBottom: 4,
            }}
          >
            {confirmPay === 'Cash' ? 'Pay with Cash' : 'Pay with Card'}
          </div>

          <div
            style={{
              fontSize: 12,
              color: 'var(--ink-faint)',
              marginBottom: 12,
            }}
          >
            {confirmPay === 'Cash'
              ? 'This will complete the sale immediately'
              : 'Open card terminal to process payment'}
          </div>

          <div
            className="mono"
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: 'var(--ink)',
              marginBottom: 18,
              padding: '8px 0',
              borderTop: '2px solid var(--ink)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            {money(t.total)}
          </div>

          {customer && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--green)',
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              ★ {customer.name.split(' ')[0]} earns {t.pointsEarned} pts
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setConfirmPay(null)}
              style={{
                flex: 1,
                padding: '11px 0',
                borderRadius: 9,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--ink-soft)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={proceedPay}
              style={{
                flex: 2,
                padding: '11px 0',
                borderRadius: 9,
                border: 'none',
                background: 'var(--ink)',
                color: 'var(--card)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {confirmPay === 'Cash' ? `Collect ${money(t.total)}` : `Charge ${money(t.total)}`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}