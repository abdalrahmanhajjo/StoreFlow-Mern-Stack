import { useMemo, useState } from 'react';
import { useSales } from '@/features/sales/salesStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { money } from '@/lib/format';
import { Button, toast } from '@/components/ui';

export default function ReportsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const sales = useSales((s) => s.sales);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.createdAt);
      const matchFrom = !from || d >= new Date(from);
      const matchTo = !to || d <= new Date(to + 'T23:59:59');
      return matchFrom && matchTo;
    });
  }, [sales, from, to]);

  const revenue = useMemo(() => filtered.reduce((n, s) => n + s.total, 0), [filtered]);
  const avgOrder = useMemo(() => filtered.length ? revenue / filtered.length : 0, [filtered, revenue]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    filtered.forEach((s) => s.lines.forEach((l) => {
      const r = map.get(l.name) ?? { name: l.name, units: 0, revenue: 0 };
      r.units += l.qty; r.revenue += l.qty * l.price;
      map.set(l.name, r);
    }));
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filtered]);

  const cashiers = useMemo(() => {
    const map = new Map<string, { cashier: string; invoices: number; revenue: number }>();
    filtered.forEach((s) => {
      const r = map.get(s.cashier) ?? { cashier: s.cashier, invoices: 0, revenue: 0 };
      r.invoices += 1; r.revenue += s.total;
      map.set(s.cashier, r);
    });
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const unitsSold = topProducts.reduce((n, r) => n + r.units, 0);
  const rankIcon = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  const exportCsv = () => {
    if (filtered.length === 0) return toast('Nothing to export');
    const header = ['Invoice', 'Customer', 'Cashier', 'Items', 'Payment', 'Subtotal', 'Discount', 'Tax', 'Total', 'Date'];
    const lines = filtered.map((s) => [
      s.invoiceNo, `"${s.customerName ?? 'Walk-in'}"`, s.cashier,
      s.lines.reduce((n, l) => n + l.qty, 0), s.payment,
      s.subtotal.toFixed(2), s.discount.toFixed(2), s.tax.toFixed(2), s.total.toFixed(2),
      new Date(s.createdAt).toLocaleDateString(),
    ].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${filtered.length} sale${filtered.length !== 1 ? 's' : ''} exported`);
  };

  const exportPdf = () => {
    toast('PDF report generation — coming soon');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Reports &amp; analytics</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{filtered.length} of {sales.length} invoices · {money(revenue)} total revenue</p>
        </div>
        <div style={{ display: 'flex', gap: 6, width: isMobile ? '100%' : undefined, flexDirection: isMobile ? 'row' : 'row' }}>
          <Button variant="ghost" size="sm" onClick={exportCsv} disabled={filtered.length === 0} style={{ flex: isMobile ? 1 : undefined, justifyContent: 'center' }}>⤓ CSV</Button>
          <Button variant="ghost" size="sm" onClick={exportPdf} disabled={filtered.length === 0} style={{ flex: isMobile ? 1 : undefined, justifyContent: 'center' }}>⤓ PDF</Button>
        </div>
      </div>

      {/* Date range + type filter */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: isMobile ? '100%' : undefined }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" style={{ flex: 1, padding: isMobile ? '10px 12px' : '8px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', minWidth: 0 }} />
          <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" style={{ flex: 1, padding: isMobile ? '10px 12px' : '8px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', minWidth: 0 }} />
        </div>
        {(from || to) && (
          <button type="button" onClick={() => { setFrom(''); setTo(''); }}
            style={{ padding: isMobile ? '8px 14px' : '6px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'transparent', fontSize: isMobile ? 13 : 12, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}
          >Clear dates</button>
        )}
      </div>

      <style>{`
        .sf-rpt-card { transition: box-shadow .2s, transform .2s; }
        .sf-rpt-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .sf-rpt-card, .sf-rpt-card-actions { transition: none; }
          .sf-rpt-card:hover { transform: none; }
        }
      `}</style>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 20 }}>
        {[
          { label: 'Revenue', value: money(revenue), color: 'var(--green)' },
          { label: 'Invoices', value: sales.length, color: 'var(--ink)' },
          { label: 'Avg. order', value: money(avgOrder), color: 'var(--blue-deep)' },
          { label: 'Units sold', value: unitsSold, color: 'var(--blue-deep)' },
        ].map((s, i) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)', gridColumn: isMobile && i > 1 ? '1 / -1' : undefined }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Main content: 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 18 }}>

        {/* Top-selling products */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Top-selling products</h3>
          </div>
          {topProducts.length === 0 ? (
            <div style={{ padding: isMobile ? 24 : 32, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
              No sales yet — complete a sale in POS.
            </div>
          ) : (
            <div style={{ padding: isMobile ? 8 : 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topProducts.map((p, i) => (
                <div key={p.name} className="sf-rpt-card" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12, padding: isMobile ? '10px 12px' : '10px 14px', borderRadius: 'var(--radius)', background: 'var(--paper)', border: '1px solid var(--line-soft)' }}>
                  <span style={{ fontSize: isMobile ? 13 : 13, fontWeight: 700, color: 'var(--ink-faint)', minWidth: isMobile ? 24 : 28, textAlign: 'center' }}>{rankIcon(i)}</span>
                  <span style={{ flex: 1, fontSize: isMobile ? 13 : 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: isMobile ? 12 : 12, fontWeight: 700, color: 'var(--ink)' }}>{p.units} units</div>
                    <div className="mono" style={{ fontSize: isMobile ? 11 : 11, color: 'var(--ink-soft)' }}>{money(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cashier performance */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Cashier performance</h3>
          </div>
          {cashiers.length === 0 ? (
            <div style={{ padding: isMobile ? 24 : 32, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
              No sales yet.
            </div>
          ) : (
            <div style={{ padding: isMobile ? 8 : 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cashiers.map((c, i) => (
                <div key={c.cashier} className="sf-rpt-card" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12, padding: isMobile ? '10px 12px' : '10px 14px', borderRadius: 'var(--radius)', background: 'var(--paper)', border: '1px solid var(--line-soft)' }}>
                  <div style={{ width: isMobile ? 32 : 34, height: isMobile ? 32 : 34, borderRadius: '50%', background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fef9c3' : 'var(--paper-dim)', color: i === 0 ? '#d97706' : i === 1 ? '#64748b' : i === 2 ? '#ca8a04' : 'var(--ink-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 12 : 13, fontWeight: 800, flexShrink: 0 }}>
                    {c.cashier.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? 13 : 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cashier}</div>
                    <div style={{ fontSize: isMobile ? 11.5 : 11.5, color: 'var(--ink-soft)' }}>{c.invoices} invoice{c.invoices !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="mono" style={{ fontSize: isMobile ? 14 : 14, fontWeight: 800, color: 'var(--ink)' }}>{money(c.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
