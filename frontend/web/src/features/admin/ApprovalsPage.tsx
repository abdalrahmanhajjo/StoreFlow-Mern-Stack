import { useEffect, useState } from 'react';
import { useApprovals, useTenants, type Application } from './adminStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge, Button, confirmDialog, toast } from '@/components/ui';
import { isConnected } from '@/lib/api/resources';
import { refreshAdminStores } from '@/lib/api/hydrate';

export default function ApprovalsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { applications, approve, reject } = useApprovals();
  const activeStores = useTenants((s) => s.tenants.filter((t) => t.status === 'active').length);
  const [refreshing, setRefreshing] = useState(false);

  const pull = async () => {
    if (!isConnected) return;
    setRefreshing(true);
    try { await refreshAdminStores(); } catch { /* toasts handled upstream */ }
    finally { setRefreshing(false); }
  };

  // Pull the latest pending registrations whenever the page opens, and keep it
  // current with light polling — so registrations from any device show up
  // without the admin reloading the app.
  useEffect(() => {
    void pull();
    if (!isConnected) return;
    const id = setInterval(() => { void refreshAdminStores(); }, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flaggedCount = applications.filter((a) => a.flagged).length;

  const onApprove = (a: Application) => {
    approve(a.id);
    toast(`${a.name} approved — workspace provisioned`);
  };

  const onReject = async (a: Application) => {
    if (await confirmDialog(`Reject the application from "${a.name}"?`)) {
      reject(a.id);
      toast(`${a.name} application rejected`);
    }
  };

  const formatType = (t: string) => t === 'Unknown' ? { label: t, tone: 'red' as const } : { label: t, tone: 'grey' as const };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Platform</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Store approvals</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>New store registrations from every device, awaiting review before activation.</p>
        </div>
        {isConnected && (
          <Button variant="ghost" onClick={pull} disabled={refreshing} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>
            {refreshing ? 'Refreshing…' : '↻ Refresh'}
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Pending review', value: applications.length, color: 'var(--amber)' },
          { label: 'Flagged', value: flaggedCount, color: flaggedCount ? 'var(--red)' : 'var(--ink-faint)' },
          { label: 'Active stores', value: activeStores, color: 'var(--green)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Status banner */}
      {applications.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--amber-faint)', color: 'var(--amber-deep)', border: '1px solid #e0d1a8', padding: isMobile ? '11px 14px' : '12px 16px', borderRadius: 10, fontSize: isMobile ? 12.5 : 13, marginBottom: isMobile ? 14 : 18, fontWeight: 500 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8731d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <b>{applications.length} store{applications.length > 1 ? 's' : ''}</b> pending review. Approve to provision an isolated workspace, or reject the application.
        </div>
      )}

      <style>{`
        .sf-app-card { transition: box-shadow .2s, transform .2s; }
        .sf-app-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .sf-app-card { transition: none; }
          .sf-app-card:hover { transform: none; }
        }
      `}</style>

      {/* Application cards */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 12 : 20 }}>
        {applications.length === 0 ? (
          <div style={{ padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>Queue is clear</p>
            <p style={{ fontSize: isMobile ? 12 : 13, color: 'var(--ink-soft)', margin: 0 }}>No pending applications.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {applications.map((a) => {
              const typeInfo = formatType(a.type);

              return (
                <div key={a.id} className="sf-app-card" style={{ background: 'var(--card)', border: a.flagged ? '1.5px solid var(--red)' : '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: a.flagged ? '0 0 0 2px rgba(220,38,38,.08)' : 'var(--shadow)', position: 'relative' }}>
                  {a.flagged && (
                    <div style={{ background: 'var(--red)', color: 'var(--card)', fontSize: isMobile ? 10 : 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '4px 14px', textAlign: 'center' }}>
                      ⚑ Flagged — review carefully
                    </div>
                  )}
                  <div style={{ padding: isMobile ? '14px 16px' : '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 10 : 12 }}>
                      <div style={{ width: isMobile ? 38 : 40, height: isMobile ? 38 : 40, borderRadius: 10, background: a.color, color: '#f4f4f1', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 13 : 14, fontWeight: 800, flexShrink: 0 }}>{a.initials}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: isMobile ? 14 : 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                        <div className="mono" style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>{a.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 10 : 12, flexWrap: 'wrap' }}>
                      <Badge tone={typeInfo.tone}>{typeInfo.label}</Badge>
                      <Badge tone={a.plan === 'Free' ? 'grey' : 'amber'}>{a.plan}</Badge>
                      <Badge tone="grey">{a.submitted}</Badge>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button onClick={() => onApprove(a)} style={{ flex: 1, justifyContent: 'center' }}>✓ Approve</Button>
                      <Button variant="danger" onClick={() => onReject(a)} style={{ flex: 1, justifyContent: 'center' }}>✕ Reject</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
