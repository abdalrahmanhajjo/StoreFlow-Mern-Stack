import { useState } from 'react';
import { useSecurity, type Session, type BlockedIp, type Attempt } from './securityStore';
import { KpiCard, Card, Badge, Button, DataTable, toast, type Column } from '@/components/ui';

export default function SecurityPage() {
  const { sessions, blockedIps, attempts, forceLogout, revokeAll, blockIp, unblockIp } = useSecurity();
  const [ip, setIp] = useState('');

  const onBlock = () => {
    const res = blockIp(ip);
    if (!res.ok) return toast(res.error ?? 'Could not block');
    toast(`${ip} blocked`);
    setIp('');
  };

  const sessionCols: Column<Session>[] = [
    { key: 'user', header: 'User', render: (s) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.user}</span> },
    { key: 'ip', header: 'IP · device', render: (s) => <span style={{ fontSize: 12, color: 'var(--ink-soft)' }} className="mono">{s.ip} · {s.device}</span> },
    { key: 'started', header: 'Started', render: (s) => <span className="mono">{s.started}</span> },
    { key: 'act', header: '', align: 'right', render: (s) => <Button variant="danger" size="sm" onClick={() => { forceLogout(s.id); toast(`Forced logout — ${s.user}`); }}>Force logout</Button> },
  ];
  const ipCols: Column<BlockedIp>[] = [
    { key: 'ip', header: 'IP address', render: (b) => <span className="mono">{b.ip}</span> },
    { key: 'reason', header: 'Reason', render: (b) => <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{b.reason}</span> },
    { key: 'act', header: '', align: 'right', render: (b) => <Button variant="ghost" size="sm" onClick={() => { unblockIp(b.id); toast(`${b.ip} unblocked`); }}>Unblock</Button> },
  ];
  const attemptCols: Column<Attempt>[] = [
    { key: 'account', header: 'Account' },
    { key: 'ip', header: 'IP', render: (a) => <span className="mono">{a.ip}</span> },
    { key: 'when', header: 'Time', render: (a) => <span className="mono">{a.when}</span> },
    { key: 'result', header: 'Result', render: (a) => <Badge tone={a.result === 'Success' ? 'green' : 'red'}>{a.result === 'Failed' ? 'Failed ×14' : a.result}</Badge> },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Trust &amp; safety</div>
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Security &amp; sessions</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Monitor authentication, force logouts, and block suspicious sources.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard label="Failed logins (24h)" value="37" delta="▲ from 21" />
        <KpiCard label="Active sessions" value={sessions.length} />
        <KpiCard label="Blocked IPs" value={blockedIps.length} />
        <KpiCard label="2FA coverage" value="68%" delta="▲ 4%" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Active sessions</h3>
            <Button variant="ghost" size="sm" onClick={() => { revokeAll(); toast('All sessions revoked'); }}>Revoke all</Button>
          </div>
          <DataTable columns={sessionCols} data={sessions} rowKey={(s) => s.id} emptyText="No active sessions." />
        </Card>
        <Card>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Blocked IPs</h3></div>
          <DataTable columns={ipCols} data={blockedIps} rowKey={(b) => b.id} emptyText="No blocked IPs." />
          <div style={{ padding: 14, borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
            <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Block an IP address…" style={{ flex: 1, padding: '8px 11px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink)' }} />
            <Button variant="dark" size="sm" onClick={onBlock}>Block</Button>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Recent login attempts</h3></div>
        <DataTable columns={attemptCols} data={attempts} rowKey={(a) => a.id} />
      </Card>
    </>
  );
}
