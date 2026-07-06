import { useTenants, type Plan } from './adminStore';
import { Card, Badge, Button, DataTable, toast, type Column } from '@/components/ui';
import { useMemo } from 'react';

const PLANS: { key: Plan; price: string; blurb: string }[] = [
  { key: 'Free', price: '$0', blurb: '1 staff, 1 register, up to 50 products. Core POS only.' },
  { key: 'Pro', price: '$49', blurb: 'Up to 10 staff, suppliers, purchase orders, full reporting.' },
  { key: 'Enterprise', price: '$99', blurb: 'Unlimited staff, advanced analytics, multi-branch, priority support.' },
];

const MATRIX: { feature: string; free: string; pro: string; ent: string }[] = [
  { feature: 'Product limit', free: '50', pro: 'Unlimited', ent: 'Unlimited' },
  { feature: 'Staff accounts', free: '1', pro: '10', ent: 'Unlimited' },
  { feature: 'Suppliers & purchase orders', free: '—', pro: '✓', ent: '✓' },
  { feature: 'Advanced analytics', free: '—', pro: '—', ent: '✓' },
  { feature: 'Multi-branch', free: '—', pro: '—', ent: '✓' },
  { feature: 'Priority support', free: '—', pro: '—', ent: '✓' },
];

export default function PlansPage() {
  const { tenants, setPlan } = useTenants();

  const counts = useMemo(() => {
    const c: Record<Plan, number> = { Free: 0, Pro: 0, Enterprise: 0 };
    tenants.forEach((t) => { c[t.plan] += 1; });
    return c;
  }, [tenants]);

  const cell = (v: string) => <span style={{ color: v === '✓' ? 'var(--green)' : v === '—' ? 'var(--ink-faint)' : 'var(--ink-soft)', fontWeight: v === '✓' ? 700 : 400 }}>{v}</span>;
  const matrixCols: Column<(typeof MATRIX)[number]>[] = [
    { key: 'feature', header: 'Feature', render: (r) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.feature}</span> },
    { key: 'free', header: 'Free', align: 'center', render: (r) => cell(r.free) },
    { key: 'pro', header: 'Pro', align: 'center', render: (r) => cell(r.pro) },
    { key: 'ent', header: 'Enterprise', align: 'center', render: (r) => cell(r.ent) },
  ];

  const assignCols: Column<(typeof tenants)[number]>[] = [
    { key: 'name', header: 'Store', render: (t) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.name}</span> },
    { key: 'status', header: 'Status', render: (t) => <Badge tone={t.status === 'active' ? 'green' : 'red'}>{t.status}</Badge> },
    { key: 'plan', header: 'Plan', align: 'right', render: (t) => (
      <select aria-label={`Plan for ${t.name}`} value={t.plan} onChange={(e) => { setPlan(t.id, e.target.value as Plan); toast(`${t.name} moved to ${e.target.value}`); }} style={{ padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12.5, background: '#fff', color: 'var(--ink)' }}>
        <option>Free</option><option>Pro</option><option>Enterprise</option>
      </select>
    ) },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Platform · business layer</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Subscription plans</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Control feature access and store limits per plan.</p>
        </div>
        <Button onClick={() => toast('New plan draft created')}>+ Add plan</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 18 }}>
        {PLANS.map((p) => (
          <Card key={p.key} style={{ padding: 18, borderColor: p.key === 'Pro' ? 'var(--amber)' : undefined }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: p.key === 'Pro' ? 'var(--amber)' : 'var(--ink-faint)', fontWeight: 600 }}>{p.key}{p.key === 'Pro' ? ' — most popular' : ''}</div>
            <div className="display mono" style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink)' }}>{p.price}<span style={{ fontSize: 13, color: 'var(--ink-faint)', fontWeight: 500 }}>/mo</span></div>
            <p style={{ color: 'var(--ink-soft)', margin: '8px 0 14px', fontSize: 13 }}>{p.blurb}</p>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}><b style={{ color: 'var(--ink)' }}>{counts[p.key]}</b> stores on this plan</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Feature access matrix</h3></div>
          <DataTable columns={matrixCols} data={MATRIX} rowKey={(r) => r.feature} />
        </Card>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Assign plan to store</h3></div>
          <DataTable columns={assignCols} data={tenants} rowKey={(t) => t.id} />
        </Card>
      </div>
    </>
  );
}
