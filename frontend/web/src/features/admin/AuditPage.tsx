import { useState, useMemo } from 'react';
import { useAudit, type AuditEntry } from './securityStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge, Button, toast } from '@/components/ui';

const KIND_TONE: Record<AuditEntry['kind'], 'green' | 'amber' | 'blue' | 'grey'> = {
  store: 'green', auth: 'amber', billing: 'blue', user: 'grey',
};

const actionLabel = (a: string) =>
  a.replace(/\./g, ' · ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AuditPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const entries = useAudit((s) => s.entries);
  const [q, setQ] = useState('');
  const [kindFilter, setKindFilter] = useState('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    entries.forEach((e) => { c[e.kind] = (c[e.kind] ?? 0) + 1; });
    return c;
  }, [entries]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries.filter((e) => {
      const matchQ = !term || e.actor.toLowerCase().includes(term) || e.action.toLowerCase().includes(term) || e.target.toLowerCase().includes(term);
      const matchKind = kindFilter === 'all' || e.kind === kindFilter;
      return matchQ && matchKind;
    });
  }, [entries, q, kindFilter]);

  const exportCsv = () => {
    if (rows.length === 0) return toast('Nothing to export');
    const header = ['Time', 'Actor', 'Action', 'Target', 'IP', 'Kind'];
    const lines = rows.map((e) => [e.time, `"${e.actor}"`, e.action, `"${e.target}"`, e.ip, e.kind].join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${rows.length} entr${rows.length !== 1 ? 'ies' : 'y'} exported`);
  };

  const stlInput: React.CSSProperties = {
    padding: isMobile ? '11px 14px' : '9px 14px',
    border: '1px solid var(--line)',
    borderRadius: 9,
    fontSize: isMobile ? 16 : 13,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    background: 'var(--card)',
    width: isMobile ? '100%' : undefined,
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Trust &amp; safety</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Audit logs</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>Immutable record of every privileged action across the platform.</p>
        </div>
        <Button variant="ghost" onClick={exportCsv} disabled={rows.length === 0} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>⤓ Export logs</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Total entries', value: entries.length, color: 'var(--ink)' },
          { label: 'Store actions', value: counts.store ?? 0, color: 'var(--green)' },
          { label: 'Auth events', value: counts.auth ?? 0, color: 'var(--amber)' },
          { label: 'User / Billing', value: (counts.user ?? 0) + (counts.billing ?? 0), color: 'var(--blue-deep)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + kind filter */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label="Search actor, action or target" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search actor, action or target…" style={{ ...stlInput, flex: '1 1 200px', minWidth: 140 }} />
        <select aria-label="Filter by type" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} style={{ ...stlInput, flex: '0 1 auto' }}>
          <option value="all">All actions</option>
          <option value="store">Store</option>
          <option value="user">User</option>
          <option value="auth">Auth</option>
          <option value="billing">Billing</option>
        </select>
      </div>

      <style>{`
        .sf-audit-row { transition: background .12s, box-shadow .12s; }
        .sf-audit-row:hover { background: var(--paper); box-shadow: 0 1px 4px -2px rgba(0,0,0,.06); }
        @media (prefers-reduced-motion: reduce) { .sf-audit-row { transition: none; } }
      `}</style>

      {/* Audit table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '100px 1fr' : '100px 100px 1fr 1fr 100px', gap: isMobile ? 6 : 8, padding: isMobile ? '8px 12px' : '10px 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: isMobile ? 10.5 : 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
          <span>Time</span>
          {isMobile ? null : <><span>Actor</span><span>Action</span><span>Target</span><span>IP</span></>}
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: isMobile ? '36px 16px' : '48px 24px', textAlign: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No matching log entries.</p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>Try adjusting your search or filter.</p>
          </div>
        ) : isMobile ? (
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((e) => (
              <div key={e.id} className="sf-audit-row" style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{e.time}</span>
                    <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{actionLabel(e.action)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  <strong>{e.actor}</strong> → {e.target} · <span className="mono">{e.ip}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {rows.map((e) => (
              <div key={e.id} className="sf-audit-row" style={{ display: 'grid', gridTemplateColumns: '100px 100px 1fr 1fr 100px', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--line-soft)', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{e.time}</span>
                <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{e.actor}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{actionLabel(e.action)}</span>
                </div>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.target}</span>
                <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{e.ip}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
