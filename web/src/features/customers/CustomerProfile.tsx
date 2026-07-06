import { useParams, useNavigate } from 'react-router-dom';
import { useCustomers } from './customersStore';
import { useSales } from '@/features/sales/salesStore';
import { tierFor } from './loyalty';
import { money, points as fmtPoints } from '@/lib/format';
import { Card, KpiCard, TierBadge, Button, DataTable, type Column } from '@/components/ui';
import { useMemo } from 'react';

interface LedgerRow { when: string; kind: string; delta: string; invoice: string }

// SF-903: customer profile — contact, spend, points, tier, history, loyalty ledger
export default function CustomerProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const customer = useCustomers((s) => s.getById(id));
  const sales = useSales((s) => s.sales);

  const history = useMemo(() => (customer ? sales.filter((s) => s.customerName === customer.name) : []), [sales, customer]);
  const ledger: LedgerRow[] = useMemo(
    () =>
      history.flatMap((s) => {
        const rows: LedgerRow[] = [];
        if (s.pointsEarned > 0) rows.push({ when: new Date(s.createdAt).toLocaleDateString(), kind: 'Earned', delta: `+${s.pointsEarned}`, invoice: s.invoiceNo });
        if (s.pointsRedeemed > 0) rows.push({ when: new Date(s.createdAt).toLocaleDateString(), kind: 'Redeemed', delta: `-${s.pointsRedeemed}`, invoice: s.invoiceNo });
        return rows;
      }),
    [history]
  );

  if (!customer) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-soft)' }}>Customer not found.</p>
        <Button variant="ghost" onClick={() => navigate('/customers')}>Back to customers</Button>
      </div>
    );
  }

  const historyCols: Column<(typeof history)[number]>[] = [
    { key: 'invoiceNo', header: 'Invoice', render: (r) => <span className="mono">{r.invoiceNo}</span> },
    { key: 'items', header: 'Items', render: (r) => `${r.lines.reduce((n, l) => n + l.qty, 0)} items` },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="mono">{money(r.total)}</span> },
    { key: 'payment', header: 'Payment' },
    { key: 'when', header: 'Date', render: (r) => <span className="mono">{new Date(r.createdAt).toLocaleDateString()}</span> },
  ];
  const ledgerCols: Column<LedgerRow>[] = [
    { key: 'when', header: 'Date', render: (r) => <span className="mono">{r.when}</span> },
    { key: 'kind', header: 'Type' },
    { key: 'delta', header: 'Points', align: 'right', render: (r) => <span className="mono" style={{ color: r.delta.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>{r.delta}</span> },
    { key: 'invoice', header: 'Invoice', render: (r) => <span className="mono">{r.invoice}</span> },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Customer</div>
          <h2 className="display" style={{ fontSize: 24, margin: 0, color: 'var(--ink)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            {customer.name} <TierBadge tier={tierFor(customer.points)} />
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }} className="mono">{customer.phone || 'No phone on file'}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/customers')}>← All customers</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Total spent" value={money(customer.spent)} />
        <KpiCard label="Loyalty points" value={fmtPoints(customer.points)} />
        <KpiCard label="Orders" value={history.length} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Purchase history</h3></div>
          <DataTable columns={historyCols} data={history} rowKey={(r) => r.invoiceNo} emptyText="No purchases yet." />
        </Card>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Loyalty ledger</h3></div>
          <DataTable columns={ledgerCols} data={ledger} rowKey={(r) => `${r.invoice}-${r.kind}`} emptyText="No points activity." />
        </Card>
      </div>
    </>
  );
}
