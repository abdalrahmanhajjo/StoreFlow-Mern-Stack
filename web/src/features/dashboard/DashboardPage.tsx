import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '@/features/sales/salesStore';
import { useProducts } from '@/features/products/productsStore';
import { KpiCard, Card, Badge, Button, DataTable, type Column } from '@/components/ui';
import { money } from '@/lib/format';

const CHECKLIST = ['Add your first product', 'Invite a staff member', 'Complete your first sale', 'Add a supplier', 'Review your first report'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const sales = useSales((s) => s.sales);
  const products = useProducts((s) => s.products);
  const [done, setDone] = useState<boolean[]>([true, false, false, false, false]);
  const [dismissed, setDismissed] = useState(false);

  const revenue = useMemo(() => sales.reduce((n, s) => n + s.total, 0), [sales]);
  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.reorderPoint), [products]);
  const recent = sales.slice(0, 5);
  const doneCount = done.filter(Boolean).length;

  const toggle = (i: number) => setDone((d) => d.map((v, idx) => (idx === i ? !v : v)));

  const recentCols: Column<(typeof recent)[number]>[] = [
    { key: 'invoiceNo', header: 'Invoice', render: (s) => <span className="mono">{s.invoiceNo}</span> },
    { key: 'customer', header: 'Customer', render: (s) => s.customerName ?? 'Walk-in' },
    { key: 'total', header: 'Total', align: 'right', render: (s) => <span className="mono">{money(s.total)}</span> },
    { key: 'payment', header: 'Payment' },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Overview</div>
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Dashboard</h2>
      </div>

      {!dismissed && doneCount < CHECKLIST.length && (
        <Card style={{ padding: 18, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Finish setting up your store</div>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{doneCount} of {CHECKLIST.length} done</span>
          </div>
          <div style={{ height: 7, borderRadius: 6, background: 'var(--paper-dim)', overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ height: '100%', width: `${(doneCount / CHECKLIST.length) * 100}%`, background: 'linear-gradient(90deg,#3B82F6,#2563EB)', borderRadius: 6 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
            {CHECKLIST.map((c, i) => (
              <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: done[i] ? 'var(--ink-faint)' : 'var(--ink)', cursor: 'pointer' }}>
                <input type="checkbox" checked={done[i]} onChange={() => toggle(i)} />
                <span style={{ textDecoration: done[i] ? 'line-through' : 'none' }}>{c}</span>
              </label>
            ))}
          </div>
          {doneCount >= CHECKLIST.length - 1 && <Button variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={() => setDismissed(true)}>Dismiss</Button>}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Revenue (session)" value={money(revenue)} />
        <KpiCard label="Invoices" value={sales.length} />
        <KpiCard label="Low-stock items" value={lowStock.length} />
        <KpiCard label="Products" value={products.length} />
      </div>

      {lowStock.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF8EC', color: '#B45309', border: '1px solid #FBE3B3', padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 18, fontWeight: 500 }}>
          ⚠ {lowStock.length} product{lowStock.length > 1 ? 's need' : ' needs'} restocking.
          <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/inventory')}>View inventory</Button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Recent sales</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>All sales</Button>
          </div>
          <DataTable columns={recentCols} data={recent} rowKey={(s) => s.invoiceNo} emptyText="No sales yet — head to the POS." />
        </Card>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Low stock</h3></div>
          <div style={{ padding: '6px 20px 14px' }}>
            {lowStock.length === 0 ? (
              <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Everything is above threshold.</p>
            ) : lowStock.slice(0, 6).map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span style={{ fontSize: 13, color: 'var(--ink)' }}>{p.emoji} {p.name}</span>
                <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} left</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
