import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSales } from '@/features/sales/salesStore';
import { useProducts } from '@/features/products/productsStore';
import { useEmployees } from '@/features/employees/employeesStore';
import { useSupply } from '@/features/suppliers/supplyStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { money } from '@/lib/format';
import { Badge, Button } from '@/components/ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DashboardPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const sales = useSales((s) => s.sales);
  const products = useProducts((s) => s.products);
  const employees = useEmployees((s) => s.employees);
  const suppliers = useSupply((s) => s.suppliers);
  const [dismissed, setDismissed] = useState(false);

  // Onboarding progress reflects real store data, not a stored guess.
  const checklist = useMemo(
    () => [
      { label: 'Add your first product', done: products.length > 0, to: '/products' },
      { label: 'Invite a staff member', done: employees.length > 1, to: '/employees' },
      { label: 'Complete your first sale', done: sales.length > 0, to: '/pos' },
      { label: 'Add a supplier', done: suppliers.length > 0, to: '/suppliers' },
      { label: 'Review your reports', done: sales.length > 0, to: '/reports' },
    ],
    [products.length, employees.length, sales.length, suppliers.length]
  );

  const revenue = useMemo(() => sales.reduce((n, s) => n + s.total, 0), [sales]);
  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.reorderPoint), [products]);
  const recent = sales.slice(0, 5);
  const doneCount = checklist.filter((c) => c.done).length;
  const pendingCount = checklist.length - doneCount;
  const totalQty = useMemo(() => products.reduce((n, p) => n + p.stock, 0), [products]);

  const trend = useMemo(() => {
    return DAYS.map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toISOString().slice(0, 10);
      return sales.filter((s) => new Date(s.createdAt).toISOString().startsWith(dayStr)).reduce((n, s) => n + s.total, 0);
    });
  }, [sales]);

  const maxTrend = Math.max(...trend, 1);

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 14 : 18 }}>
        <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Overview</div>
        <h2 className="display" style={{ fontSize: isMobile ? 20 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Dashboard</h2>
        <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{sales.length} invoices · {products.length} products · {money(revenue)} total revenue</p>
      </div>

      {/* Onboarding checklist — derived from real store data (read-only) */}
      {!dismissed && doneCount < checklist.length && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 14 : 18, marginBottom: isMobile ? 14 : 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 8 : 10 }}>
            <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 14, color: 'var(--ink)' }}>
              {pendingCount === 0 ? '🎉 All set!' : `Finish setting up your store (${pendingCount} left)`}
            </div>
            <span style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)' }}>{doneCount} of {checklist.length} done</span>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: 'var(--paper-dim)', overflow: 'hidden', marginBottom: isMobile ? 10 : 12 }}>
            <div style={{ height: '100%', width: `${(doneCount / checklist.length) * 100}%`, background: 'var(--ink)', borderRadius: 6, transition: 'width .3s' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit,minmax(220px,1fr))', gap: isMobile ? 6 : 8 }}>
            {checklist.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => !c.done && navigate(c.to)}
                style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 9, fontSize: isMobile ? 12.5 : 13, color: c.done ? 'var(--ink-faint)' : 'var(--ink)', cursor: c.done ? 'default' : 'pointer', padding: isMobile ? '5px 0' : 0, background: 'none', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
              >
                <span aria-hidden style={{ width: isMobile ? 16 : 15, height: isMobile ? 16 : 15, borderRadius: 4, border: `1.5px solid ${c.done ? 'var(--green)' : 'var(--line)'}`, background: c.done ? 'var(--green)' : 'transparent', color: 'var(--card)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{c.done ? '✓' : ''}</span>
                <span style={{ textDecoration: c.done ? 'line-through' : 'none' }}>{c.label}</span>
              </button>
            ))}
          </div>
          {doneCount >= checklist.length - 1 && (
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} style={{ marginTop: isMobile ? 10 : 12 }}>Dismiss</Button>
          )}
        </div>
      )}

      <style>{`
        .sf-dash-card { transition: box-shadow .2s, transform .2s; }
        .sf-dash-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-dash-row { transition: background .12s; cursor: pointer; }
        .sf-dash-row:hover { background: var(--paper); }
        @media (prefers-reduced-motion: reduce) {
          .sf-dash-card, .sf-dash-row { transition: none; }
          .sf-dash-card:hover { transform: none; }
        }
      `}</style>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 14, marginBottom: isMobile ? 14 : 20 }}>
        {[
          { label: 'Revenue', value: money(revenue), color: 'var(--green)' },
          { label: 'Invoices', value: sales.length, color: 'var(--ink)' },
          { label: 'Products', value: products.length, color: 'var(--blue-deep)' },
          { label: 'Total stock', value: totalQty, color: 'var(--amber)' },
        ].map((s) => (
          <div key={s.label} className="sf-dash-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Low-stock alert */}
      {lowStock.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-faint)', color: 'var(--amber-deep)', border: '1px solid #e0d1a8', padding: isMobile ? '11px 14px' : '12px 16px', borderRadius: 10, fontSize: isMobile ? 12.5 : 13, marginBottom: isMobile ? 14 : 18, fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8731d" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span><b>{lowStock.length}</b> product{lowStock.length > 1 ? 's need' : ' needs'} restocking.</span>
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} style={{ marginLeft: 'auto', flexShrink: 0 }}>View inventory</Button>
        </div>
      )}

      {/* Trend chart + Low stock side panel */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 18, marginBottom: isMobile ? 14 : 18 }}>
        {/* Sales trend chart */}
        <div className="sf-dash-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 16 : 20 }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Sales trend (7 days)</h3>
            <span style={{ fontSize: isMobile ? 11 : 12, color: 'var(--ink-faint)' }}>{money(trend.reduce((n, v) => n + v, 0))}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 8 : 10, height: isMobile ? 100 : 120, paddingTop: isMobile ? 10 : 14 }}>
            {trend.map((v, i) => (
              <div key={i} style={{ flex: 1, position: 'relative', height: `${(v / maxTrend) * 100}%`, minHeight: 8, background: 'var(--ink)', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <span style={{ position: 'absolute', bottom: -16, left: 0, right: 0, textAlign: 'center', fontSize: isMobile ? 9 : 10, color: 'var(--ink-faint)' }}>{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low-stock quick view */}
        <div className="sf-dash-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Low stock</h3>
            {lowStock.length > 0 && <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>All</Button>}
          </div>
          {lowStock.length === 0 ? (
            <div style={{ padding: isMobile ? 24 : 32, textAlign: 'center', color: 'var(--ink-faint)', fontSize: isMobile ? 13 : 13 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Everything is above threshold.
            </div>
          ) : (
            <div style={{ padding: isMobile ? 6 : 8 }}>
              {lowStock.slice(0, 6).map((p) => (
                <div key={p.id} className="sf-dash-row" onClick={() => navigate('/inventory')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '10px 10px' : '10px 12px', borderRadius: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: isMobile ? 13 : 13, color: 'var(--ink)' }}>{p.emoji} {p.name}</span>
                  <Badge tone={p.stock === 0 ? 'red' : 'amber'}>{p.stock} left</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent sales + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 18 }}>
        {/* Recent sales */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Recent sales</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>All sales</Button>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: isMobile ? '32px 16px' : '40px 24px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: isMobile ? 13 : 13 }}>
              No sales yet — head to the POS.
            </div>
          ) : isMobile ? (
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent.map((s) => (
                <div key={s.invoiceNo} className="sf-dash-row" onClick={() => navigate(`/sales/${s.invoiceNo}/receipt`)} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{s.invoiceNo}</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{money(s.total)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'flex', gap: 8 }}>
                    <span>{s.customerName ?? 'Walk-in'}</span>
                    <span>{s.payment}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 70px', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <span>Invoice</span><span>Customer</span><span style={{ textAlign: 'right' }}>Total</span><span>Payment</span>
              </div>
              <div>
                {recent.map((s) => (
                  <div key={s.invoiceNo} className="sf-dash-row" onClick={() => navigate(`/sales/${s.invoiceNo}/receipt`)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 70px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', alignItems: 'center' }}>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>{s.invoiceNo}</span>
                    <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>{s.customerName ?? 'Walk-in'}</span>
                    <span className="mono" style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 13, textAlign: 'right' }}>{money(s.total)}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{s.payment}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Alerts */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Alerts &amp; activity</h3>
          </div>
          <div style={{ padding: isMobile ? '6px 12px 14px' : '6px 16px 14px' }}>
            {[
              lowStock.length > 0 && { icon: '📦', title: `${lowStock.length} product${lowStock.length > 1 ? 's' : ''} low on stock`, desc: 'Reorder before they run out.', color: 'var(--amber)', action: '/inventory' },
              sales.length === 0 && { icon: '🛒', title: 'No sales recorded yet', desc: 'Complete your first sale in the POS.', color: 'var(--blue-deep)', action: '/pos' },
              products.length === 0 && { icon: '🏷️', title: 'No products added', desc: 'Start building your catalog.', color: 'var(--ink-faint)', action: '/products' },
              { icon: '📊', title: `${sales.length} invoice${sales.length !== 1 ? 's' : ''} this session`, desc: `${money(revenue)} total revenue generated.`, color: 'var(--green)' },
            ].filter((x): x is { icon: string; title: string; desc: string; color: string; action?: string } => Boolean(x)).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: isMobile ? 10 : 12, padding: isMobile ? '11px 0' : '13px 0', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 'none', cursor: a.action ? 'pointer' : undefined }}
                onClick={() => a.action && navigate(a.action)}
              >
                <span style={{ fontSize: isMobile ? 16 : 18, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 600, color: 'var(--ink)' }}>{a.title}</div>
                  <div style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-faint)', marginTop: 1 }}>{a.desc}</div>
                </div>
                {a.action && <span style={{ fontSize: isMobile ? 11 : 11, color: 'var(--ink-faint)', flexShrink: 0 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
