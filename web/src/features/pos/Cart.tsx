import { useNavigate } from 'react-router-dom';
import { useCart, useCartTotals, MAX_DISCOUNT, type PayMethod } from './cartStore';
import { completeSale } from './checkout';
import { useCustomers } from '@/features/customers/customersStore';
import { useSession } from '@/store/session';
import { POINTS_BLOCK } from '@/features/customers/loyalty';
import { money, points as fmtPoints } from '@/lib/format';
import { SearchCombobox, ProductThumb, toast, type ComboOption } from '@/components/ui';

const PAY: PayMethod[] = ['Cash', 'Card', 'Mobile'];

export function Cart() {
  const navigate = useNavigate();
  const cashier = useSession((s) => s.user?.name ?? 'Cashier');
  const { items, payMethod, customer, redeeming, discountRate, changeQty, remove, setPay, setCustomer, toggleRedeem, setDiscountRate } = useCart();
  const t = useCartTotals();

  const custStore = useCustomers();

  const options: ComboOption[] = custStore.customers.map((c) => ({ value: c.id, label: c.name, hint: `${c.points} pts` }));

  const onSelectCustomer = (id: string) => {
    const c = custStore.getById(id);
    if (c) setCustomer({ id: c.id, name: c.name, points: c.points });
  };
  const onCreateCustomer = (name: string) => {
    const c = custStore.create(name); // SF-504: add-new
    setCustomer({ id: c.id, name: c.name, points: c.points });
    toast(`New customer “${c.name}” created`);
  };

  const onRedeem = () => {
    if (!customer) return toast('Select a customer first');
    if (customer.points < POINTS_BLOCK) return toast(`Needs at least ${POINTS_BLOCK} points to redeem`);
    toggleRedeem();
  };

  const onCheckout = () => {
    const res = completeSale(cashier);
    if (!res.ok) return toast(res.error);
    const s = res.sale;
    toast(`Sale ${s.invoiceNo} · ${money(s.total)} by ${s.payment}` + (s.customerName ? ` · +${s.pointsEarned} pts` : ''));
    navigate(`/sales/${s.invoiceNo}/receipt`);
  };

  return (
    <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 80, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', background: 'var(--paper)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: 'var(--ink)', fontSize: 13.5 }}>Current sale</strong>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Cashier: {cashier}</span>
      </div>

      {/* customer + loyalty */}
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SearchCombobox placeholder="Search customer or add new…" options={options} onSearch={() => {}} onSelect={onSelectCustomer} onCreate={onCreateCustomer} />
        {customer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#b45309', background: '#fef3c7', border: '1px solid #fbe3b3', padding: '5px 12px', borderRadius: 999 }}>★ {fmtPoints(customer.points)} pts</span>
            <button type="button" onClick={onRedeem} disabled={customer.points < POINTS_BLOCK} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--blue-border)', background: redeeming ? 'var(--blue)' : 'var(--blue-soft)', color: redeeming ? '#fff' : 'var(--blue-deep)', fontSize: 12, fontWeight: 600, cursor: customer.points < POINTS_BLOCK ? 'not-allowed' : 'pointer', opacity: customer.points < POINTS_BLOCK ? 0.5 : 1 }}>
              {redeeming ? 'Redeeming' : 'Redeem'}
            </button>
          </div>
        )}
      </div>

      {/* items */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 16px', maxHeight: 320 }}>
        {items.length === 0 ? (
          <div style={{ padding: '28px 12px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>Sale is empty.<br />Tap a product to begin.</div>
        ) : (
          items.map((i) => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '13px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <ProductThumb src={i.image} emoji={i.emoji} alt={i.name} size={34} radius={7} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{i.name}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 8, padding: '2px 4px' }}>
                    <button type="button" onClick={() => changeQty(i.id, -1)} aria-label="Decrease" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, width: 20 }}>−</button>
                    <span className="mono" style={{ fontSize: 12 }}>{i.qty}</span>
                    <button type="button" onClick={() => changeQty(i.id, 1)} aria-label="Increase" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, width: 20 }}>+</button>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{money(i.price * i.qty)}</div>
                <button type="button" onClick={() => remove(i.id)} style={{ border: 'none', background: 'none', color: 'var(--ink-faint)', fontSize: 11, cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* totals + checkout */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
        <Row label={`Discount (${Math.round(discountRate * 100)}%)`} value={`-${money(t.discount)}`} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 10px' }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Adjust discount</span>
          <input type="range" min={0} max={MAX_DISCOUNT * 100} value={discountRate * 100} onChange={(e) => setDiscountRate(Number(e.target.value) / 100)} style={{ flex: 1 }} aria-label="Discount percent" />
        </div>
        <Row label="Subtotal" value={money(t.subtotal)} />
        {t.redeem > 0 && <Row label={`Points redeemed (${t.redeemPoints})`} value={`-${money(t.redeem)}`} accent />}
        <Row label="Tax" value={money(t.tax)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700, margin: '12px 0 4px', color: 'var(--ink)' }}>
          <span>Total</span><span className="mono">{money(t.total)}</span>
        </div>
        {customer && items.length > 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--green)', fontWeight: 600, textAlign: 'right', marginBottom: 8 }}>★ {customer.name.split(' ')[0]} will earn {t.pointsEarned} pts</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '10px 0 12px' }}>
          {PAY.map((m) => (
            <button type="button" key={m} onClick={() => setPay(m)} style={{ padding: '10px 0', borderRadius: 9, border: '1px solid var(--line)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: payMethod === m ? 'var(--blue-soft)' : '#fff', color: payMethod === m ? 'var(--blue-deep)' : 'var(--ink-soft)', borderColor: payMethod === m ? 'var(--blue-border)' : 'var(--line)' }}>{m}</button>
          ))}
        </div>
        <button type="button" onClick={onCheckout} style={{ width: '100%', background: 'linear-gradient(180deg,#3B82F6,#2563EB)', color: '#fff', border: 'none', padding: 13, borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Complete sale →</button>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8, color: 'var(--ink-soft)' }}>
      <span>{label}</span>
      <span className="mono" style={{ color: accent ? 'var(--green)' : 'var(--ink)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
