import { useMemo, useState } from 'react';
import { useSales } from '@/features/sales/salesStore';
import { KpiCard, Card, DataTable, Button, toast, type Column } from '@/components/ui';
import { money } from '@/lib/format';

interface TopRow { name: string; units: number; revenue: number }
interface CashierRow { cashier: string; invoices: number; revenue: number }

export default function ReportsPage() {
  const sales = useSales((s) => s.sales);
  const [range, setRange] = useState('This month');

  const revenue = useMemo(() => sales.reduce((n, s) => n + s.total, 0), [sales]);

  const topProducts = useMemo(() => {
    const map = new Map<string, TopRow>();
    sales.forEach((s) => s.lines.forEach((l) => {
      const r = map.get(l.name) ?? { name: l.name, units: 0, revenue: 0 };
      r.units += l.qty; r.revenue += l.qty * l.price;
      map.set(l.name, r);
    }));
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [sales]);

  const cashiers = useMemo(() => {
    const map = new Map<string, CashierRow>();
    sales.forEach((s) => {
      const r = map.get(s.cashier) ?? { cashier: s.cashier, invoices: 0, revenue: 0 };
      r.invoices += 1; r.revenue += s.total;
      map.set(s.cashier, r);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const topCols: Column<TopRow>[] = [
    { key: 'name', header: 'Product' },
    { key: 'units', header: 'Units sold', align: 'right', render: (r) => <span className="mono">{r.units}</span> },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => <span className="mono">{money(r.revenue)}</span> },
  ];
  const cashierCols: Column<CashierRow>[] = [
    { key: 'cashier', header: 'Cashier' },
    { key: 'invoices', header: 'Invoices', align: 'right', render: (r) => <span className="mono">{r.invoices}</span> },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => <span className="mono">{money(r.revenue)}</span> },
  ];

  const selStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, background: '#fff', fontFamily: 'inherit', color: 'var(--ink)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Reports &amp; analytics</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)} style={selStyle}>
            <option>This month</option><option>Last 7 days</option><option>This quarter</option>
          </select>
          <Button variant="ghost" onClick={() => toast('Report exported (PDF)')}>⤓ Export PDF</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Revenue" value={money(revenue)} delta="live from sales" />
        <KpiCard label="Invoices" value={sales.length} />
        <KpiCard label="Avg. order value" value={money(sales.length ? revenue / sales.length : 0)} />
        <KpiCard label="Units sold" value={topProducts.reduce((n, r) => n + r.units, 0)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Top-selling products</h3></div>
          <DataTable columns={topCols} data={topProducts} rowKey={(r) => r.name} emptyText="No sales yet — complete a sale in POS." />
        </Card>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Cashier performance</h3></div>
          <DataTable columns={cashierCols} data={cashiers} rowKey={(r) => r.cashier} emptyText="No sales yet." />
        </Card>
      </div>
    </>
  );
}
