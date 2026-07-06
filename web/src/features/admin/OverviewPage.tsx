import { useTenants, useApprovals } from './adminStore';
import { useProducts } from '@/features/products/productsStore';
import { KpiCard, Card, Button, DataTable, toast, type Column } from '@/components/ui';
import { money } from '@/lib/format';

const BARS = [46, 58, 52, 70, 64, 84, 96];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

const ACTIVITY = [
  { dot: 'var(--green)', title: 'Store approved', desc: 'Sunrise Pharmacy activated on Pro plan', when: '2m ago' },
  { dot: 'var(--red)', title: 'Store suspended', desc: 'Northbridge Mini-Mart — payment failed ×3', when: '1h ago' },
  { dot: '#D97706', title: 'Suspicious logins', desc: '14 failed attempts from 41.92.x.x — IP blocked', when: '3h ago' },
  { dot: 'var(--green)', title: 'Plan upgraded', desc: 'Casa Pasta moved Free → Pro', when: '5h ago' },
];

export default function OverviewPage() {
  const tenants = useTenants((s) => s.tenants);
  const pending = useApprovals((s) => s.applications.length);
  void useProducts; // reserved for future cross-store aggregation

  const active = tenants.filter((t) => t.status === 'active').length;
  const suspended = tenants.filter((t) => t.status === 'suspended').length;
  const top = [...tenants].filter((t) => t.status === 'active').sort((a, b) => b.salesMtd - a.salesMtd).slice(0, 4);

  const cols: Column<(typeof top)[number]>[] = [
    { key: 'name', header: 'Store', render: (t) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: t.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{t.initials}</span>
        <span><span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>{t.name}</span><span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{t.owner}</span></span>
      </span>
    ) },
    { key: 'plan', header: 'Plan' },
    { key: 'salesMtd', header: 'Sales (MTD)', align: 'right', render: (t) => <span className="mono">{money(t.salesMtd)}</span> },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Platform · root access</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Platform overview</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Real-time view across every store. No tenant restrictions applied.</p>
        </div>
        <Button variant="ghost" onClick={() => toast('Global report exported (CSV)')}>⤓ Export report</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 14 }}>
        <KpiCard label="Active stores" value={active.toLocaleString()} delta="▲ 28 this week" />
        <KpiCard label="Platform revenue (MTD)" value="$94,280" delta="▲ 7.1%" />
        <KpiCard label="Transactions today" value="18.4k" delta="▲ 3.2%" />
        <KpiCard label="Suspended stores" value={suspended} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total sales logged" value="2.1M" />
        <KpiCard label="Total users" value="11,602" />
        <KpiCard label="Pending approvals" value={pending} delta={pending ? 'needs review' : 'clear'} />
        <KpiCard label="Failed logins (24h)" value="37" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Platform sales volume</h3><span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Last 7 months</span></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, paddingTop: 24 }}>
            {BARS.map((h, i) => (
              <div key={i} style={{ flex: 1, position: 'relative', height: `${h}%`, background: 'linear-gradient(180deg,#3B82F6,#2563EB)', borderRadius: '6px 6px 0 0' }}>
                <span style={{ position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center', fontSize: 10.5, color: 'var(--ink-faint)' }}>{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--ink)' }}>System health</h3>
          <Health label="API uptime (30d)" pct={99.95} text="99.95%" />
          <Health label="Avg response time" pct={88} text="142ms" />
          <Health label="Database load" pct={41} text="41%" />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Most active stores</h3></div>
          <DataTable columns={cols} data={top} rowKey={(t) => t.id} />
        </Card>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Recent platform activity</h3></div>
          <div style={{ padding: '6px 20px 14px' }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '13px 0', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: a.dot }} />{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{a.desc}</div>
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{a.when}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Health({ label, pct, text }: { label: string; pct: number; text: string }) {
  return (
    <>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 7, borderRadius: 6, background: 'var(--paper-dim)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 6, background: 'linear-gradient(90deg,#16A34A,#4ADE80)' }} />
        </div>
        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', minWidth: 42, textAlign: 'right' }}>{text}</span>
      </div>
    </>
  );
}
