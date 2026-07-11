import { useMemo } from 'react';
import { useTenants, useApprovals, usePlatformUsers } from './adminStore';
import { useSecurity, useAudit } from './securityStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { money } from '@/lib/format';
import { Button, toast } from '@/components/ui';
import { isConnected } from '@/lib/api/resources';

const BARS = [46, 58, 52, 70, 64, 84, 96];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

const ACTIVITY = [
  { dot: 'var(--green)', title: 'Store approved', desc: 'Sunrise Pharmacy activated on Pro plan', when: '2m ago' },
  { dot: 'var(--red)', title: 'Store suspended', desc: 'Northbridge Mini-Mart — payment failed ×3', when: '1h ago' },
  { dot: 'var(--amber)', title: 'Suspicious logins', desc: '14 failed attempts from 41.92.x.x — IP blocked', when: '3h ago' },
  { dot: 'var(--green)', title: 'Plan upgraded', desc: 'Casa Pasta moved Free → Pro', when: '5h ago' },
  { dot: 'var(--blue)', title: 'New store registered', desc: 'Al Madina Grocers joined the platform', when: '8h ago' },
  { dot: 'var(--green)', title: 'Payment recovered', desc: 'Northbridge Mini-Mart — payment retry succeeded', when: '12h ago' },
];

const rankIcon = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

export default function OverviewPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const tenants = useTenants((s) => s.tenants);
  const pending = useApprovals((s) => s.applications.length);
  const platformUsers = usePlatformUsers((s) => s.users);
  const sessions = useSecurity((s) => s.sessions);
  const attempts = useSecurity((s) => s.attempts);
  const auditEntries = useAudit((s) => s.entries);

  const active = tenants.filter((t) => t.status === 'active').length;
  const suspended = tenants.filter((t) => t.status === 'suspended').length;
  const revenueMtd = useMemo(() => tenants.reduce((n, t) => n + t.salesMtd, 0), [tenants]);
  const failedLogins = attempts.filter((a) => a.result !== 'Success').length;
  const top = useMemo(() => [...tenants].filter((t) => t.status === 'active').sort((a, b) => b.salesMtd - a.salesMtd).slice(0, 6), [tenants]);

  // Connected mode reports only what the API actually knows: platform-wide
  // sales rollups don't exist yet, so those tiles show an honest dash, and
  // the activity feed comes from the real audit log.
  const activityFeed = isConnected
    ? auditEntries.slice(0, 6).map((e) => ({
        dot: e.kind === 'auth' ? 'var(--amber)' : e.kind === 'user' ? 'var(--blue)' : 'var(--green)',
        title: e.action,
        desc: `${e.target} — ${e.actor}`,
        when: e.time,
      }))
    : ACTIVITY;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 16 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Platform · root access</div>
          <h2 className="display" style={{ fontSize: isMobile ? 20 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Platform overview</h2>
          <p style={{ margin: '3px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12.5 : 13 }}>{active} active · {suspended} suspended · {money(revenueMtd)} MTD</p>
        </div>
        <Button variant="ghost" onClick={() => toast('Global report exported (CSV)')} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>⤓ Export report</Button>
      </div>

      <style>{`
        .sf-admin-card { transition: box-shadow .2s, transform .2s; }
        .sf-admin-card:active { transform: scale(.98); }
        .sf-admin-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .sf-admin-card, .sf-admin-card:active { transition: none; transform: none; }
        }
      `}</style>

      {/* KPI — 8 stats in 2 rows of 4, mobile: 4 rows of 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 10 : 14 }}>
        {[
          { label: 'Active stores', value: active.toLocaleString(), color: 'var(--green)' },
          { label: 'Platform revenue (MTD)', value: isConnected ? '—' : money(revenueMtd), color: 'var(--ink)' },
          { label: 'Active sessions', value: sessions.length.toLocaleString(), color: 'var(--blue-deep)' },
          { label: 'Suspended', value: suspended, color: 'var(--red)' },
        ].map((s) => (
          <div key={s.label} className="sf-admin-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '12px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 19 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 16 : 22 }}>
        {[
          { label: 'Audit events', value: isConnected ? auditEntries.length.toLocaleString() : '2.1M', color: 'var(--ink)' },
          { label: 'Total users', value: isConnected ? platformUsers.length.toLocaleString() : '11,602', color: 'var(--blue-deep)' },
          { label: 'Pending approvals', value: pending, color: pending ? 'var(--amber)' : 'var(--green)' },
          { label: 'Failed logins', value: isConnected ? failedLogins.toLocaleString() : '37', color: 'var(--red)' },
        ].map((s) => (
          <div key={s.label} className="sf-admin-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '12px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 19 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Chart + Health. The demo bars and health claims are demo-only —
          the API has no platform sales rollup or uptime metrics to back them. */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile || isConnected ? '1fr' : '1.6fr 1fr', gap: isMobile ? 14 : 18, marginBottom: isMobile ? 14 : 18 }}>
        {!isConnected && (
          <div className="sf-admin-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 18 : 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 20 : 22 }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? 15 : 15, color: 'var(--ink)' }}>Platform sales volume</h3>
              <span style={{ fontSize: isMobile ? 11 : 12, color: 'var(--ink-faint)' }}>Last 7 months</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 10 : 10, height: isMobile ? 140 : 170, paddingTop: isMobile ? 14 : 20 }}>
              {BARS.map((h, i) => (
                <div key={i} style={{ flex: 1, position: 'relative', height: `${h}%`, background: 'var(--ink)', borderRadius: '6px 6px 0 0', minHeight: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <span style={{ position: 'absolute', bottom: -18, left: 0, right: 0, textAlign: 'center', fontSize: isMobile ? 10 : 10.5, color: 'var(--ink-faint)' }}>{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sf-admin-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 18 : 20 }}>
          {isConnected ? (
            <>
              <h3 style={{ margin: '0 0 18px', fontSize: isMobile ? 15 : 15, color: 'var(--ink)' }}>Platform activity</h3>
              <Health label="Active sessions" pct={Math.min(100, sessions.length * 10)} text={String(sessions.length)} isMobile={isMobile} />
              <Health label="Failed logins (log)" pct={attempts.length ? (failedLogins / attempts.length) * 100 : 0} text={String(failedLogins)} isMobile={isMobile} />
              <Health label="Audit events (log)" pct={Math.min(100, auditEntries.length)} text={String(auditEntries.length)} isMobile={isMobile} />
            </>
          ) : (
            <>
              <h3 style={{ margin: '0 0 18px', fontSize: isMobile ? 15 : 15, color: 'var(--ink)' }}>System health</h3>
              <Health label="API uptime (30d)" pct={99.95} text="99.95%" isMobile={isMobile} />
              <Health label="Avg response time" pct={88} text="142ms" isMobile={isMobile} />
              <Health label="Database load" pct={41} text="41%" isMobile={isMobile} />
            </>
          )}
        </div>
      </div>

      {/* Most active stores + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 18 }}>
        <div className="sf-admin-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '16px 18px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 15 : 15, color: 'var(--ink)' }}>Most active stores</h3>
          </div>
          {top.length === 0 ? (
            <div style={{ padding: isMobile ? 32 : 40, textAlign: 'center', color: 'var(--ink-faint)', fontSize: isMobile ? 13 : 13 }}>No active stores.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 4 : 4, padding: isMobile ? 12 : 14 }}>
              {top.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 12, padding: isMobile ? '13px 14px' : '12px 14px', borderRadius: 'var(--radius)', background: 'var(--paper)', border: '1px solid var(--line-soft)' }}>
                  <span style={{ fontSize: isMobile ? 14 : 13, fontWeight: 700, color: 'var(--ink-faint)', minWidth: isMobile ? 26 : 26, textAlign: 'center', flexShrink: 0 }}>{rankIcon(i)}</span>
                  <div style={{ width: isMobile ? 36 : 30, height: isMobile ? 36 : 30, borderRadius: 9, background: t.color, color: '#f4f4f1', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 12 : 11, fontWeight: 700, flexShrink: 0 }}>{t.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? 14 : 13, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: isMobile ? 12 : 11.5, color: 'var(--ink-faint)' }}>{t.owner} · {t.plan}</div>
                  </div>
                  <div className="mono" style={{ fontSize: isMobile ? 15 : 14, fontWeight: 800, color: 'var(--ink)', textAlign: 'right', flexShrink: 0 }}>{money(t.salesMtd)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sf-admin-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '16px 18px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 15 : 15, color: 'var(--ink)' }}>Recent platform activity</h3>
          </div>
          <div style={{ padding: isMobile ? '8px 14px 14px' : '6px 20px 14px' }}>
            {activityFeed.length === 0 && (
              <div style={{ padding: isMobile ? 24 : 32, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>No platform activity yet.</div>
            )}
            {activityFeed.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: isMobile ? 12 : 16, padding: isMobile ? '14px 0' : '13px 0', borderBottom: i < activityFeed.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: isMobile ? 14 : 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.dot, flexShrink: 0 }} />{a.title}
                  </div>
                  <div style={{ fontSize: isMobile ? 12.5 : 12, color: 'var(--ink-faint)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                </div>
                <span style={{ fontSize: isMobile ? 12 : 11.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.when}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Health({ label, pct, text, isMobile }: { label: string; pct: number; text: string; isMobile: boolean }) {
  return (
    <div style={{ marginBottom: isMobile ? 16 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: isMobile ? 13 : 12, color: 'var(--ink-faint)', fontWeight: 500 }}>{label}</span>
        <span className="mono" style={{ fontSize: isMobile ? 13 : 13, fontWeight: 700, color: 'var(--ink)' }}>{text}</span>
      </div>
      <div style={{ height: isMobile ? 8 : 7, borderRadius: 6, background: 'var(--paper-dim)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 6, background: 'var(--green)', transition: 'width .4s ease' }} />
      </div>
    </div>
  );
}
