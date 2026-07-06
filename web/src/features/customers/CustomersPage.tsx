import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from './customersStore';
import { useSales } from '@/features/sales/salesStore';
import { tierFor } from './loyalty';
import { useSession } from '@/store/session';
import { can } from '@/lib/rbac';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { money, points as fmtPoints } from '@/lib/format';
import { Modal, Button, TierBadge, toast, confirmDialog } from '@/components/ui';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#b45309', Silver: '#64748b', Gold: '#ca8a04',
};
const TIER_BG: Record<string, string> = {
  Bronze: '#fef3c7', Silver: '#f1f5f9', Gold: '#fef9c3',
};

const TIER_THRESHOLDS = [
  { tier: 'Bronze', min: 0, next: 100 },
  { tier: 'Silver', min: 100, next: 500 },
  { tier: 'Gold', min: 500, next: null },
] as const;

function tierProgress(points: number): { pct: number; label: string } {
  for (const t of TIER_THRESHOLDS) {
    if (points >= t.min && (t.next === null || points < t.next)) {
      if (t.next === null) return { pct: 100, label: 'Max tier' };
      const pct = Math.min(100, Math.round(((points - t.min) / (t.next - t.min)) * 100));
      return { pct, label: `${fmtPoints(points - t.min)} / ${fmtPoints(t.next - t.min)} to ${t.tier}` };
    }
  }
  return { pct: 0, label: '' };
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const role = useSession((s) => s.user!.role);
  const writable = can(role, 'customer.create');
  const { customers, create, update, remove } = useCustomers();
  const sales = useSales((s) => s.sales);

  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return customers
      .filter((c) => {
        const matchQ = !term || c.name.toLowerCase().includes(term) || c.phone.toLowerCase().includes(term);
        const tier = tierFor(c.points);
        const matchT = tierFilter === 'all' || tier === tierFilter;
        return matchQ && matchT;
      })
      .map((c) => ({ ...c, orders: sales.filter((s) => s.customerName === c.name).length }));
  }, [customers, sales, query, tierFilter]);

  const totalPoints = useMemo(() => customers.reduce((s, c) => s + c.points, 0), [customers]);
  const avgSpent = useMemo(() => customers.length ? customers.reduce((s, c) => s + c.spent, 0) / customers.length : 0, [customers]);

  const openNew = () => {
    setEditingId(null); setName(''); setPhone(''); setFormOpen(true);
  };

  const openEdit = (c: typeof rows[number]) => {
    setEditingId(c.id); setName(c.name); setPhone(c.phone); setFormOpen(true);
  };

  const onSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return toast('Enter a customer name');
    if (editingId) {
      update(editingId, { name: trimmed, phone });
      toast('Customer updated');
    } else {
      create(trimmed, phone);
      toast(`Customer “${trimmed}” added`);
    }
    setFormOpen(false);
  };

  const onDelete = async (c: typeof rows[number]) => {
    if (c.orders > 0) return toast(`Cannot delete — ${c.orders} sale(s) linked to “${c.name}”`);
    if (await confirmDialog(`Remove customer “${c.name}”?`)) {
      remove(c.id);
      toast(`“${c.name}” removed`);
    }
  };

  const initial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Relationships</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Customers</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{customers.length} customers · {fmtPoints(totalPoints)} total points</p>
        </div>
        {writable && <Button onClick={openNew} style={{ width: isMobile ? '100%' : undefined }}>+ Add customer</Button>}
      </div>

      <style>{`
        .sf-cust-card { transition: box-shadow .2s, transform .2s; }
        .sf-cust-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-cust-card-actions { opacity: 0; transition: opacity .15s; }
        .sf-cust-card:hover .sf-cust-card-actions,
        .sf-cust-card:focus-within .sf-cust-card-actions { opacity: 1; }
        @media (hover: none) { .sf-cust-card-actions { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sf-cust-card, .sf-cust-card-actions { transition: none; }
          .sf-cust-card:hover { transform: none; }
        }
      `}</style>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Total customers', value: customers.length, color: 'var(--ink)' },
          { label: 'Total points issued', value: fmtPoints(totalPoints), color: 'var(--blue-deep)' },
          { label: 'Avg. spent', value: money(avgSpent), color: 'var(--green)' },
        ].map((s, i) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)', gridColumn: isMobile && i === 2 ? '1 / -1' : undefined }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + tier filter */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: isMobile ? 'column' : 'row' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or phone…" style={{ padding: isMobile ? '11px 14px' : '9px 14px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : '1 1 200px', minWidth: isMobile ? undefined : 160 }} />
        <div style={{ display: 'flex', gap: 3, width: isMobile ? '100%' : undefined }}>
          {(['all', 'Bronze', 'Silver', 'Gold'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTierFilter(t)} style={{ flex: isMobile ? 1 : undefined, padding: isMobile ? '10px 0' : '7px 14px', borderRadius: 8, fontSize: isMobile ? 13 : 12, fontWeight: 600, border: '1px solid var(--line)', cursor: 'pointer', background: tierFilter === t ? '#0f172a' : '#fff', color: tierFilter === t ? '#fff' : 'var(--ink-soft)' }}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 12 : 20 }}>
        {rows.length === 0 ? (
          <div style={{ padding: isMobile ? '36px 16px' : '48px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              {query || tierFilter !== 'all' ? 'No matches' : 'No customers yet'}
            </p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>
              {query || tierFilter !== 'all' ? 'Try a different search or filter.' : 'Add a customer to start tracking loyalty.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {rows.map((c) => {
              const tier = tierFor(c.points);
              const prog = tierProgress(c.points);
              return (
                <div key={c.id} className="sf-cust-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                  <div style={{ padding: isMobile ? 14 : 16, paddingBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, marginBottom: 10 }}>
                      <div style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: 10, background: TIER_BG[tier], color: TIER_COLORS[tier], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 15 : 17, fontWeight: 800, flexShrink: 0 }}>{initial(c.name)}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                          <span style={{ fontSize: isMobile ? 14 : 14, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                          <TierBadge tier={tier} />
                        </div>
                        <div className="mono" style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>{c.phone || '—'}</div>
                      </div>
                    </div>

                    {/* Points & progress */}
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span className="mono" style={{ fontSize: isMobile ? 17 : 18, fontWeight: 800, color: 'var(--ink)' }}>{fmtPoints(c.points)} <span style={{ fontSize: isMobile ? 11 : 11, fontWeight: 600, color: 'var(--ink-faint)' }}>pts</span></span>
                        <span style={{ fontSize: isMobile ? 10 : 10.5, color: 'var(--ink-faint)', fontWeight: 600 }}>{prog.label}</span>
                      </div>
                      <div style={{ height: isMobile ? 5 : 5, background: 'var(--line-soft)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${prog.pct}%`, borderRadius: 3, background: TIER_COLORS[tier], transition: 'width .3s' }} />
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 12, fontSize: isMobile ? 12 : 11.5, color: 'var(--ink-soft)' }}>
                      <span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{c.orders}</span> order{c.orders !== 1 ? 's' : ''}</span>
                      <span><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{money(c.spent)}</span> spent</span>
                    </div>
                  </div>

                  <div className="sf-cust-card-actions" style={{ display: 'flex', gap: isMobile ? 2 : 2, borderTop: '1px solid var(--line-soft)', background: 'var(--paper)', padding: isMobile ? '8px 10px' : '6px 8px', marginTop: 10 }}>
                    <button type="button" onClick={() => navigate(`/customers/${c.id}`)} style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 13 : 11.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >View</button>
                    {writable && (
                      <button type="button" onClick={() => openEdit(c)} style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 13 : 11.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        Edit
                      </button>
                    )}
                    {writable && (
                      <button type="button" onClick={() => onDelete(c)} disabled={c.orders > 0} style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 13 : 11.5, fontWeight: 600, background: 'transparent', border: 'none', borderRadius: 6, cursor: c.orders === 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: c.orders === 0 ? 'var(--red)' : 'var(--ink-faint)', opacity: c.orders === 0 ? 1 : 0.5 }}
                        onMouseEnter={(e) => { if (c.orders === 0) e.currentTarget.style.background = 'var(--red-soft)'; }}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        {c.orders > 0 ? `${c.orders} linked` : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit modal */}
      {writable && (
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit customer' : 'Add customer'}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamie Rivera" style={{ width: '100%', padding: isMobile ? '12px 14px' : '11px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--paper)' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Phone <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span></label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0134" style={{ width: '100%', padding: isMobile ? '12px 14px' : '11px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--paper)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setFormOpen(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={onSave} style={{ flex: 2 }}>{editingId ? 'Save changes' : 'Add customer'}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
