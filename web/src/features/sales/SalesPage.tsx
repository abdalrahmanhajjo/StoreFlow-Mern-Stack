import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales, type Sale } from './salesStore';
import { useSession } from '@/store/session';
import { money } from '@/lib/format';
import { DataTable, Badge, Button, toast, type Column } from '@/components/ui';

export default function SalesPage() {
  const navigate = useNavigate();
  const sales = useSales((s) => s.sales);
  const role = useSession((s) => s.user!.role);
  const me = useSession((s) => s.user!.name);
  const [q, setQ] = useState('');
  const [pay, setPay] = useState('all');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sales.filter((s) => {
      // A cashier only sees their own transactions.
      if (role === 'cashier' && s.cashier !== me) return false;
      const matchQ = !term || s.invoiceNo.toLowerCase().includes(term) || (s.customerName ?? 'walk-in').toLowerCase().includes(term);
      const matchPay = pay === 'all' || s.payment === pay;
      return matchQ && matchPay;
    });
  }, [sales, q, pay, role, me]);

  const exportCsv = () => {
    if (rows.length === 0) return toast('Nothing to export');
    const header = ['Invoice', 'Customer', 'Items', 'Cashier', 'Payment', 'Total'];
    const lines = rows.map((s) => [s.invoiceNo, s.customerName ?? 'Walk-in', s.lines.reduce((n, l) => n + l.qty, 0), s.cashier, s.payment, s.total.toFixed(2)].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sales.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Sales exported (CSV)');
  };

  const columns: Column<Sale>[] = [
    { key: 'invoiceNo', header: 'Invoice', render: (s) => <span className="mono">{s.invoiceNo}</span> },
    { key: 'customer', header: 'Customer', render: (s) => s.customerName ?? 'Walk-in' },
    { key: 'items', header: 'Items', render: (s) => `${s.lines.reduce((n, l) => n + l.qty, 0)} items` },
    { key: 'cashier', header: 'Cashier' },
    { key: 'payment', header: 'Payment' },
    { key: 'total', header: 'Total', align: 'right', render: (s) => <span className="mono">{money(s.total)}</span> },
    { key: 'status', header: 'Status', render: () => <Badge tone="green">Paid</Badge> },
    { key: 'act', header: '', align: 'right', render: (s) => <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/${s.invoiceNo}/receipt`)}>View →</Button> },
  ];

  const selStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, background: '#fff', fontFamily: 'inherit', color: 'var(--ink)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Transactions</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Sales &amp; invoices</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>{role === 'cashier' ? 'Your completed sales.' : 'Every completed sale.'}</p>
        </div>
        <Button variant="ghost" onClick={exportCsv}>⤓ Export CSV</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice or customer" style={{ ...selStyle, width: 240 }} />
        <select aria-label="Filter by payment" value={pay} onChange={(e) => setPay(e.target.value)} style={selStyle}>
          <option value="all">All payment methods</option>
          <option>Cash</option><option>Card</option><option>Mobile</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} rowKey={(s) => s.invoiceNo} emptyText="No sales yet — complete a sale in POS." />
      </div>
    </>
  );
}
