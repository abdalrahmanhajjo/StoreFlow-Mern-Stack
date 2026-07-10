import { useParams, useNavigate } from 'react-router-dom';
import { useCustomers } from './customersStore';
import { useSales } from '@/features/sales/salesStore';
import { tierFor } from './loyalty';
import { money, points as fmtPoints } from '@/lib/format';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Card, KpiCard, TierBadge, Button, DataTable, type Column } from '@/components/ui';
import { useMemo } from 'react';

interface LedgerRow { when: string; kind: string; delta: string; invoice: string }

export default function CustomerProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
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
      <div style={{ padding: isMobile ? 24 : 40, textAlign: 'center' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: isMobile ? 14 : 18, gap: 8, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Customer</div>
          <h2 className="display" style={{ fontSize: isMobile ? 20 : 24, margin: 0, color: 'var(--ink)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            {customer.name} <TierBadge tier={tierFor(customer.points)} />
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }} className="mono">{customer.phone || 'No phone on file'}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/customers')} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>← All customers</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit,minmax(160px,1fr))', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 16 : 20 }}>
        <KpiCard label="Total spent" value={money(customer.spent)} />
        <KpiCard label="Loyalty points" value={fmtPoints(customer.points)} />
        {!isMobile && <KpiCard label="Orders" value={history.length} />}
      </div>
      {isMobile && (
        <div style={{ marginBottom: 16 }}>
          <KpiCard label="Orders" value={history.length} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 18 }}>
        <Card>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Purchase history</h3>
          </div>
          {isMobile && history.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>No purchases yet.</div>
          ) : isMobile ? (
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {history.map((s) => (
                <div key={s.invoiceNo} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{s.invoiceNo}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{money(s.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)' }}>
                    <span>{s.lines.reduce((n, l) => n + l.qty, 0)} items · {s.payment}</span>
                    <span className="mono">{new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <DataTable columns={historyCols} data={history} rowKey={(r) => r.invoiceNo} emptyText="No purchases yet." />
          )}
        </Card>
        <Card>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Loyalty ledger</h3>
          </div>
          {isMobile && ledger.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>No points activity.</div>
          ) : isMobile ? (
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ledger.map((r, i) => (
                <div key={`${r.invoice}-${r.kind}-${i}`} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{r.kind}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }} className="mono">{r.invoice} · {r.when}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 800, color: r.delta.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>{r.delta}</span>
                </div>
              ))}
            </div>
          ) : (
            <DataTable columns={ledgerCols} data={ledger} rowKey={(r) => `${r.invoice}-${r.kind}`} emptyText="No points activity." />
          )}
        </Card>
      </div>
    </>
  );
}
