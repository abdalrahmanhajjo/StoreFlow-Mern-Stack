import { useParams, useNavigate } from 'react-router-dom';
import { useSales } from './salesStore';
import { useSession } from '@/store/session';
import { money } from '@/lib/format';
import { Button } from '@/components/ui';

// SF-505: printable receipt
export default function ReceiptPage() {
  const { invoiceNo = '' } = useParams();
  const navigate = useNavigate();
  const sale = useSales((s) => s.getByInvoice(invoiceNo));
  const store = useSession((s) => s.user?.storeId ? 'Blue Palm Grocers' : 'StoreFlow');

  if (!sale) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-soft)' }}>Receipt {invoiceNo} not found.</p>
        <Button variant="ghost" onClick={() => navigate('/pos')}>Back to POS</Button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }} className="no-print">
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Receipt</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => navigate('/pos')}>← New sale</Button>
          <Button onClick={() => window.print()}>Print</Button>
        </div>
      </div>

      <div id="receipt" style={{ maxWidth: 340, margin: '0 auto', background: '#fff', border: '1px solid var(--line)', boxShadow: 'var(--shadow-md)', borderRadius: 8, padding: '26px 22px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12, color: 'var(--ink)' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', margin: '0 0 2px', fontSize: 16 }}>{store}</h4>
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
        <div style={{ textAlign: 'center', color: 'var(--ink-soft)', marginTop: 14 }}>Thank you for shopping with us!</div>
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
