import { Logo, Button, Badge, TierBadge, KpiCard, DataTable, SearchCombobox, Switch, toast } from '@/components/ui';
import type { Column } from '@/components/ui';
import { useState } from 'react';

interface Customer { id: string; name: string; points: number; spent: number }
const CUSTOMERS: Customer[] = [
  { id: '1', name: 'Tariq Hassan', points: 240, spent: 1204.5 },
  { id: '2', name: 'Lena Marsh', points: 70, spent: 388.1 },
  { id: '3', name: 'Fatima Khoury', points: 582, spent: 2910 },
];

const columns: Column<Customer>[] = [
  { key: 'name', header: 'Customer' },
  { key: 'points', header: 'Points', align: 'right', render: (r) => <span className="mono">{r.points}</span> },
  { key: 'tier', header: 'Tier', render: (r) => <TierBadge tier={r.points >= 500 ? 'Gold' : r.points >= 100 ? 'Silver' : 'Bronze'} /> },
  { key: 'spent', header: 'Spent', align: 'right', render: (r) => <span className="mono">${r.spent.toFixed(2)}</span> },
];

// Day-1 (Sprint 0) design-system showcase. Real routes arrive in Sprint 1.
export default function App() {
  const [on, setOn] = useState(true);
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Logo size={44} />
        <h1 className="display" style={{ color: 'var(--ink)', fontSize: 26, margin: 0 }}>StoreFlow</h1>
        <Badge tone="blue">Sprint 0 · design system</Badge>
      </header>
      <p style={{ marginBottom: 28 }}>Foundation ready — tokens, providers, and reusable UI primitives.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard label="Active stores" value="3,140" delta="▲ 28 this week" />
        <KpiCard label="Platform revenue" value="$94,280" delta="▲ 7.1%" />
        <KpiCard label="Total users" value="11,602" delta="▲ 140" />
      </section>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <Button onClick={() => toast('Primary action fired')}>Primary</Button>
        <Button variant="ghost" onClick={() => toast('Ghost action')}>Ghost</Button>
        <Button variant="danger" onClick={() => toast('Danger action')}>Danger</Button>
        <Switch checked={on} onChange={setOn} label="demo toggle" />
      </div>

      <div style={{ marginBottom: 18, maxWidth: 320 }}>
        <SearchCombobox
          placeholder="Search customer or add new…"
          options={CUSTOMERS.map((c) => ({ value: c.id, label: c.name, hint: `${c.points} pts` }))}
          onSearch={() => {}}
          onSelect={(v) => toast(`Selected ${v}`)}
          onCreate={(q) => toast(`Created ${q}`)}
        />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={CUSTOMERS} rowKey={(r) => r.id} />
      </div>
    </div>
  );
}
