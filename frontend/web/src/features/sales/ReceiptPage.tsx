import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSales } from './salesStore';
import { useSession } from '@/store/session';
import { useStoreConfig } from '@/config/StoreProfileContext';
import { useStoreIdentity } from '@/lib/api/storeIdentity';
import { isConnected, apiGetStoreSettings } from '@/lib/api/resources';
import { money } from '@/lib/format';
import { Button, confirm, toast } from '@/components/ui';

// SF-505: printable receipt
export default function ReceiptPage() {
  const { invoiceNo = '' } = useParams();
  const navigate = useNavigate();
  const sale = useSales((s) => s.getByInvoice(invoiceNo));
  const voidSale = useSales((s) => s.voidSale);
  const role = useSession((s) => s.user?.role ?? null);
  const canVoid = role === 'owner' || role === 'manager';

  // Real store identity for the receipt header — never a hard-coded name.
  const realStore = useStoreIdentity((s) => s.store);
  const profileName = useStoreConfig().profile.name;
  const storeName = realStore?.name || profileName || 'StoreFlow';

  // Configurable receipt footer (falls back to the classic line).
  const [footer, setFooter] = useState('Thank you for shopping with us!');
  const [voiding, setVoiding] = useState(false);
  useEffect(() => {
    if (!isConnected) return;
    let alive = true;
    apiGetStoreSettings()
      .then((s) => { if (alive && s.receiptFooter) setFooter(s.receiptFooter); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  if (!sale) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-soft)' }}>Receipt {invoiceNo} not found.</p>
        <Button variant="ghost" onClick={() => navigate('/pos')}>Back to POS</Button>
      </div>
    );
  }

  const isVoided = sale.status === 'voided';

  const onVoid = async () => {
    if (voiding || isVoided) return;
    const ok = await confirm({
      title: `Void invoice ${sale.invoiceNo}?`,
      message: `This reverses the sale: stock is restored${sale.customerName ? ' and loyalty points are reversed' : ''}. This cannot be undone.`,
      confirmLabel: 'Void sale',
      danger: true,
    });
    if (!ok) return;
    setVoiding(true);
    const res = await voidSale(sale.invoiceNo);
    setVoiding(false);
    if (!res.ok) return toast.error(res.error ?? 'Could not void the sale');
    toast.success(`Invoice ${sale.invoiceNo} voided`, 'Stock and loyalty were reversed');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }} className="no-print">
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Receipt</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => navigate('/pos')}>← New sale</Button>
          {canVoid && !isVoided && (
            <Button variant="danger" onClick={onVoid} isLoading={voiding}>
              {voiding ? 'Voiding…' : 'Void sale'}
            </Button>
          )}
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <div id="receipt" style={{ maxWidth: 340, margin: '0 auto', background: 'var(--card)', border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)', borderRadius: 8, padding: '26px 22px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--ink)', position: 'relative' }}>
        {isVoided && (
          <div style={{ position: 'absolute', top: 12, right: 12, border: '2px solid var(--red)', color: 'var(--red)', fontWeight: 800, fontSize: 12, letterSpacing: '.1em', padding: '2px 8px', borderRadius: 6, transform: 'rotate(6deg)' }}>
            VOIDED
          </div>
        )}
        <h4 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', margin: '0 0 2px', fontSize: 16 }}>{storeName}</h4>
        <div style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>{new Date(sale.createdAt).toLocaleString()}</div>
        <hr style={{ border: 'none', borderTop: '1px dashed var(--ink-faint)', margin: '12px 0' }} />
        <Line l="Invoice" r={`#${sale.invoiceNo}`} />
        <Line l="Cashier" r={sale.cashier} />
        {sale.customerName && <Line l="Customer" r={sale.customerName} />}
        <hr style={{ border: 'none', borderTop: '1px dashed var(--ink-faint)', margin: '12px 0' }} />
        {sale.lines.map((li, idx) => (
          <Line key={idx} l={`${li.name} ×${li.qty}`} r={money(li.price * li.qty)} />
        ))}
        <hr style={{ border: 'none', borderTop: '1px dashed var(--ink-faint)', margin: '12px 0' }} />
        <Line l="Subtotal" r={money(sale.subtotal)} />
        <Line l="Discount" r={`-${money(sale.discount)}`} />
        {sale.pointsRedeemed > 0 && <Line l={`Points (${sale.pointsRedeemed})`} r={`-${money((sale.pointsRedeemed / 100) * 5)}`} />}
        <Line l="Tax" r={money(sale.tax)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginTop: 6 }}>
          <span>TOTAL</span><span>{money(sale.total)}</span>
        </div>
        <hr style={{ border: 'none', borderTop: '1px dashed var(--ink-faint)', margin: '12px 0' }} />
        <Line l="Paid via" r={sale.payment} />
        {sale.pointsEarned > 0 && <Line l="Points earned" r={`+${sale.pointsEarned}`} />}
        {isVoided && <div style={{ textAlign: 'center', color: 'var(--red)', fontWeight: 700, marginTop: 10 }}>*** THIS SALE WAS VOIDED ***</div>}
        <div style={{ textAlign: 'center', color: 'var(--ink-soft)', marginTop: 14 }}>{footer}</div>
      </div>
    </>
  );
}

function Line({ l, r }: { l: string; r: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span>{l}</span><span>{r}</span>
    </div>
  );
}
