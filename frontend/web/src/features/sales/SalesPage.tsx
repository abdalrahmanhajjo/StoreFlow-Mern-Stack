import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSales } from './salesStore';
import { useSession } from '@/store/session';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { money } from '@/lib/format';
import { Badge, Button, toast } from '@/components/ui';

export default function SalesPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sp, setSp] = useSearchParams();
  const sales = useSales((s) => s.sales);
  const role = useSession((s) => s.user!.role);
  const me = useSession((s) => s.user!.name);

  const q = sp.get('q') ?? '';
  const pay = sp.get('payment') ?? 'all';
  const cashierFilter = sp.get('cashier') ?? 'all';
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';

  const setParam = (key: string, val: string) => {
    setSp((prev) => { const n = new URLSearchParams(prev); if (val) n.set(key, val); else n.delete(key); return n; }, { replace: true });
  };

  const uniqueCashiers = useMemo(() => {
    const set = new Set(sales.map((s) => s.cashier));
    return [...set].sort();
  }, [sales]);

  const revenue = useMemo(() => sales.reduce((n, s) => n + s.total, 0), [sales]);
  const avgOrder = useMemo(() => sales.length ? revenue / sales.length : 0, [sales, revenue]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sales.filter((s) => {
      if (role === 'cashier' && s.cashier !== me) return false;
      const matchQ = !term || s.invoiceNo.toLowerCase().includes(term) || (s.customerName ?? 'walk-in').toLowerCase().includes(term);
      const matchPay = pay === 'all' || s.payment === pay;
      const matchCashier = cashierFilter === 'all' || s.cashier === cashierFilter;
      const saleDate = new Date(s.createdAt);
      const matchFrom = !from || saleDate >= new Date(from);
      const matchTo = !to || saleDate <= new Date(to + 'T23:59:59');
      return matchQ && matchPay && matchCashier && matchFrom && matchTo;
    });
  }, [sales, q, pay, cashierFilter, from, to, role, me]);

  const exportCsv = () => {
    if (rows.length === 0) return toast('Nothing to export');
    const header = ['Invoice', 'Customer', 'Cashier', 'Items', 'Payment', 'Subtotal', 'Discount', 'Tax', 'Total', 'Points Earned', 'Points Redeemed', 'Date'];
    const lines = rows.map((s) => [
      s.invoiceNo, `"${s.customerName ?? 'Walk-in'}"`, s.cashier,
      s.lines.reduce((n, l) => n + l.qty, 0), s.payment,
      s.subtotal.toFixed(2), s.discount.toFixed(2), s.tax.toFixed(2), s.total.toFixed(2),
      s.pointsEarned, s.pointsRedeemed,
      new Date(s.createdAt).toLocaleDateString(),
    ].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${rows.length} sale${rows.length !== 1 ? 's' : ''} exported`);
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Transactions</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Sales &amp; invoices</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{sales.length} invoices · {money(revenue)} total</p>
        </div>
        <Button variant="ghost" onClick={exportCsv} disabled={rows.length === 0} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>⤓ Export CSV</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Total revenue', value: money(revenue), color: 'var(--green)' },
          { label: 'Invoices', value: sales.length, color: 'var(--ink)' },
          { label: 'Avg. order', value: money(avgOrder), color: 'var(--blue-deep)' },
          { label: 'Filtered', value: rows.length, color: 'var(--amber)' },
        ].map((s, i) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)', gridColumn: isMobile && i > 1 ? '1 / -1' : undefined }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <style>{`
        .sf-sale-card { transition: box-shadow .2s, transform .2s; }
        .sf-sale-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-sale-row { transition: background .15s, box-shadow .15s; }
        .sf-sale-row:hover { background: var(--paper); box-shadow: 0 2px 8px -4px rgba(0,0,0,.08); }
        @media (prefers-reduced-motion: reduce) {
          .sf-sale-card, .sf-sale-row { transition: none; }
          .sf-sale-card:hover { transform: none; }
        }
      `}</style>

      {/* Filters toggle (mobile) */}
      {isMobile && (
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} style={{ width: '100%', padding: '11px 14px', marginBottom: 10, border: '1px solid var(--line)', borderRadius: 9, background: 'var(--card)', fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🔍 Filters {q || pay !== 'all' || cashierFilter !== 'all' || from || to ? `(${[q && 'search', pay !== 'all' && pay, cashierFilter !== 'all' && cashierFilter, from && 'dates', to && 'dates'].filter(Boolean).join(', ')})` : ''}</span>
          <span style={{ fontSize: 11, transition: 'transform .2s', transform: filtersOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>
      )}
      {/* Filters */}
      <div style={{ display: isMobile && !filtersOpen ? 'none' : 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setParam('q', e.target.value)} placeholder="Search invoice or customer…" style={{ padding: isMobile ? '11px 14px' : '9px 14px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : '1 1 160px' }} />
        <select aria-label="Filter by payment" value={pay} onChange={(e) => setParam('payment', e.target.value)} style={{ padding: isMobile ? '11px 14px' : '9px 14px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : '0 0 auto' }}>
          <option value="all">All payments</option>
          <option>Cash</option><option>Card</option><option>Mobile</option>
        </select>
        <select aria-label="Filter by cashier" value={cashierFilter} onChange={(e) => setParam('cashier', e.target.value)} style={{ padding: isMobile ? '11px 14px' : '9px 14px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : '0 0 auto' }}>
          <option value="all">All cashiers</option>
          {uniqueCashiers.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: isMobile ? '100%' : undefined }}>
          <input type="date" value={from} onChange={(e) => setParam('from', e.target.value)} aria-label="From date" style={{ flex: 1, padding: isMobile ? '10px 12px' : '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', minWidth: 0 }} />
          <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>
          <input type="date" value={to} onChange={(e) => setParam('to', e.target.value)} aria-label="To date" style={{ flex: 1, padding: isMobile ? '10px 12px' : '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', minWidth: 0 }} />
        </div>
      </div>

      {/* Table / Cards */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {rows.length === 0 ? (
          <div style={{ padding: isMobile ? '36px 16px' : '48px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              {sales.length === 0 ? 'No sales yet' : 'No matches'}
            </p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>
              {sales.length === 0 ? 'Complete a sale in POS.' : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : isMobile ? (
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((s) => (
              <div key={s.invoiceNo} onClick={() => navigate(`/sales/${s.invoiceNo}/receipt`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/sales/${s.invoiceNo}/receipt`); }}
                className="sf-sale-card" style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>{s.invoiceNo}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{s.customerName ?? 'Walk-in'}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{money(s.total)}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11.5, color: 'var(--ink-soft)', alignItems: 'center' }}>
                  <span>{s.cashier}</span>
                  <Badge tone={s.payment === 'Cash' ? 'amber' : s.payment === 'Card' ? 'blue' : 'grey'}>{s.payment}</Badge>
                  <span className="mono">{new Date(s.createdAt).toLocaleDateString()}</span>
                  {s.pointsEarned > 0 && <span style={{ color: 'var(--green)', fontWeight: 700 }}>+{s.pointsEarned} pts</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 90px 70px 90px 60px', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span>Invoice</span><span>Customer</span><span style={{ textAlign: 'right' }}>Items</span><span>Cashier</span><span>Payment</span><span style={{ textAlign: 'right' }}>Total</span><span></span>
            </div>
            {rows.map((s) => (
              <div key={s.invoiceNo} className="sf-sale-row" style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 90px 70px 90px 60px', gap: 8, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', fontSize: 13 }}
                onClick={() => navigate(`/sales/${s.invoiceNo}/receipt`)}
              >
                <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.invoiceNo}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.customerName ?? 'Walk-in'}</span>
                <span className="mono" style={{ color: 'var(--ink-soft)', textAlign: 'right' }}>{s.lines.reduce((n, l) => n + l.qty, 0)}</span>
                <span style={{ color: 'var(--ink-soft)' }}>{s.cashier}</span>
                <Badge tone={s.payment === 'Cash' ? 'amber' : s.payment === 'Card' ? 'blue' : 'grey'}>{s.payment}</Badge>
                <span className="mono" style={{ fontWeight: 800, color: 'var(--ink)', textAlign: 'right' }}>{money(s.total)}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/sales/${s.invoiceNo}/receipt`); }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', color: 'var(--ink-soft)' }}
                  onMouseEnter={(e2) => e2.currentTarget.style.background = 'var(--paper)'}
                  onMouseLeave={(e2) => e2.currentTarget.style.background = 'var(--card)'}
                >View →</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
