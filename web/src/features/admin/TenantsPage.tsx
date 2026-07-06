import { useState, useMemo } from 'react';
import { useTenants, type Tenant } from './adminStore';
import { money } from '@/lib/format';
import { DataTable, Badge, Button, confirmDialog, toast, type Column } from '@/components/ui';

export default function TenantsPage() {
  const { tenants, toggleSuspend, remove } = useTenants();
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tenants.filter((t) => {
      const matchQ = !term || t.name.toLowerCase().includes(term) || t.owner.toLowerCase().includes(term);
      const matchPlan = plan === 'all' || t.plan === plan;
      const matchStatus = status === 'all' || t.status === status;
      return matchQ && matchPlan && matchStatus;
    });
  }, [tenants, q, plan, status]);

  const onSuspend = (t: Tenant) => {
    toggleSuspend(t.id);
    toast(t.status === 'active' ? `${t.name} suspended` : `${t.name} re-activated`);
  };
  const onDelete = async (t: Tenant) => {
    if (await confirmDialog(`Permanently delete "${t.name}" and all its data? This cannot be undone.`)) {
      remove(t.id);
      toast(`${t.name} deleted permanently`);
    }
  };

  const columns: Column<Tenant>[] = [
    { key: 'name', header: 'Store', render: (t) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: t.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{t.initials}</span>
        <span><span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{t.name}</span><span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{t.owner} · {t.type}</span></span>
      </span>
    ) },
    { key: 'plan', header: 'Plan', render: (t) => <Badge tone={t.plan === 'Free' ? 'grey' : 'amber'}>{t.plan}</Badge> },
    { key: 'users', header: 'Users', align: 'right', render: (t) => <span className="mono">{t.users}</span> },
    { key: 'salesMtd', header: 'Sales (MTD)', align: 'right', render: (t) => <span className="mono">{money(t.salesMtd)}</span> },
    { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'active' ? 'green' : 'red'}>{t.status === 'active' ? 'Active' : 'Suspended'}</Badge> },
    { key: 'act', header: '', align: 'right', render: (t) => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Button variant={t.status === 'active' ? 'ghost' : 'primary'} size="sm" onClick={() => onSuspend(t)}>{t.status === 'active' ? 'Suspend' : 'Activate'}</Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(t)}>Delete</Button>
      </div>
    ) },
  ];

  const selStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, background: '#fff', fontFamily: 'inherit', color: 'var(--ink)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Platform</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Stores &amp; tenants</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Every store is isolated by <span className="mono">storeId</span> — admin bypasses this restriction.</p>
        </div>
        <Button variant="ghost" onClick={() => toast('Tenant list exported (CSV)')}>⤓ Export list</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stores or owners…" style={{ ...selStyle, width: 240 }} />
        <select aria-label="Filter by plan" value={plan} onChange={(e) => setPlan(e.target.value)} style={selStyle}>
          <option value="all">All plans</option><option>Free</option><option>Pro</option><option>Enterprise</option>
        </select>
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} style={selStyle}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} rowKey={(t) => t.id} emptyText="No stores match your filters." />
      </div>
    </>
  );
}
