import { useState, useMemo } from 'react';
import { useAudit, type AuditEntry } from './securityStore';
import { Badge, Button, DataTable, toast, type Column } from '@/components/ui';

export default function AuditPage() {
  const entries = useAudit((s) => s.entries);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries.filter((e) => {
      const matchQ = !term || e.actor.toLowerCase().includes(term) || e.action.toLowerCase().includes(term) || e.target.toLowerCase().includes(term);
      const matchKind = kind === 'all' || e.kind === kind;
      return matchQ && matchKind;
    });
  }, [entries, q, kind]);

  const tone = (k: AuditEntry['kind']): 'green' | 'amber' | 'blue' | 'grey' =>
    k === 'store' ? 'green' : k === 'auth' ? 'amber' : k === 'billing' ? 'blue' : 'grey';

  const columns: Column<AuditEntry>[] = [
    { key: 'time', header: 'Time', render: (e) => <span className="mono">{e.time}</span> },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action', render: (e) => <Badge tone={tone(e.kind)}>{e.action}</Badge> },
    { key: 'target', header: 'Target' },
    { key: 'ip', header: 'IP', render: (e) => <span className="mono">{e.ip}</span> },
  ];

  const selStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, background: '#fff', fontFamily: 'inherit', color: 'var(--ink)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Trust &amp; safety</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Audit logs</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Immutable record of every privileged action across the platform.</p>
        </div>
        <Button variant="ghost" onClick={() => toast('Audit log exported (CSV)')}>⤓ Export logs</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action or target…" style={{ ...selStyle, width: 260 }} />
        <select aria-label="Filter by type" value={kind} onChange={(e) => setKind(e.target.value)} style={selStyle}>
          <option value="all">All actions</option><option value="store">Store</option><option value="user">User</option><option value="auth">Auth</option><option value="billing">Billing</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} rowKey={(e) => e.id} emptyText="No matching log entries." />
      </div>
    </>
  );
}
