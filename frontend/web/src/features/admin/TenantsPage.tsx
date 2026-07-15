import { useState, useMemo, useRef, useEffect } from 'react';
import { useTenants, type Tenant } from './adminStore';
import { usePlatformUsers } from './adminStore';
import { usePlans } from './planStore';
import type { Plan as CatalogPlan } from './planService';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { money } from '@/lib/format';
import { Badge, Button, confirmDialog, toast } from '@/components/ui';
import auditLog from '@/data/auditLog.json';
import sessionsData from '@/data/sessions.json';

// Labels for the canonical plan features shown in the drawer's Plan tab.
const FEATURE_LABELS: Record<string, string> = {
  analytics: 'Basic analytics',
  advancedAnalytics: 'Advanced analytics & reports',
  exportReports: 'Export reports (CSV)',
  inventoryManagement: 'Inventory management',
  employeeManagement: 'Employee management',
  discountManagement: 'Discount & promotions',
  supplierManagement: 'Suppliers & purchase orders',
  integrations: 'Integrations',
  multiStore: 'Multi-store',
  customBranding: 'Custom branding',
  apiAccess: 'API access',
  auditLogs: 'Audit logs',
  prioritySupport: 'Priority support',
};

/** Human list of what a catalog plan includes (limits headline + features). */
function planFeatureList(plan: CatalogPlan | undefined): string[] {
  if (!plan) return [];
  const staff = plan.limits.membersPerStore;
  const products = plan.limits.productsPerStore;
  return [
    staff === -1 ? 'Unlimited staff accounts' : `Up to ${staff} staff account${staff === 1 ? '' : 's'}`,
    products === -1 ? 'Unlimited products' : `Up to ${products.toLocaleString()} products`,
    ...Object.entries(FEATURE_LABELS)
      .filter(([key]) => plan.features[key as keyof typeof plan.features])
      .map(([, label]) => label),
  ];
}

const statusColor = (s: string) => s === 'active' ? 'var(--green)' : 'var(--red)';

export default function TenantsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { tenants, toggleSuspend, remove, setPlan } = useTenants();
  const users = usePlatformUsers((s) => s.users);
  // The real plan catalog — drives the drawer's plan selector and the filter.
  const { plans: catalogPlans, loaded: plansLoaded, load: loadPlans } = usePlans();
  useEffect(() => { if (!plansLoaded) loadPlans(); }, [plansLoaded, loadPlans]);

  const [q, setQ] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [tab, setTab] = useState('overview');

  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length;
  const revenueMtd = useMemo(() => tenants.reduce((n, t) => n + t.salesMtd, 0), [tenants]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tenants.filter((t) => {
      const matchQ = !term || t.name.toLowerCase().includes(term) || t.owner.toLowerCase().includes(term);
      const matchPlan = planFilter === 'all' || t.plan === planFilter;
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchQ && matchPlan && matchStatus;
    });
  }, [tenants, q, planFilter, statusFilter]);

  const onSuspend = (t: Tenant) => {
    toggleSuspend(t.id);
    toast(t.status === 'active' ? `${t.name} suspended` : `${t.name} re-activated`);
  };

  const onDelete = async (t: Tenant) => {
    if (await confirmDialog(`Permanently delete "${t.name}" and all its data? This cannot be undone.`)) {
      remove(t.id);
      if (selected?.id === t.id) setSelected(null);
      toast(`${t.name} deleted permanently`);
    }
  };

  const onPlanChange = (id: string, planCode: string) => {
    const plan = catalogPlans.find((p) => p.code === planCode);
    if (!plan) return toast('Plan not found');
    setPlan(id, plan.code, plan.name); // toasts on server confirm / rolls back on error
    if (selected?.id === id) setSelected({ ...selected, plan: plan.name });
  };

  const stlInput: React.CSSProperties = { 
    padding: isMobile ? '11px 14px' : '9px 14px', 
    border: '1px solid var(--line)', 
    borderRadius: 9, 
    fontSize: isMobile ? 16 : 13, 
    fontFamily: 'inherit', 
    color: 'var(--ink)', 
    background: 'var(--card)', 
    width: isMobile ? '100%' : undefined 
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Platform</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Stores &amp; tenants</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{tenants.length} stores · {activeCount} active · {money(revenueMtd)} MTD</p>
        </div>
        <Button variant="ghost" onClick={() => toast('Tenant list exported (CSV)')} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>⤓ Export list</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Total stores', value: tenants.length, color: 'var(--ink)' },
          { label: 'Active', value: activeCount, color: 'var(--green)' },
          { label: 'Suspended', value: suspendedCount, color: 'var(--red)' },
          { label: 'Platform revenue (MTD)', value: money(revenueMtd), color: 'var(--blue-deep)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label="Search stores or owners" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stores or owners…" style={{ ...stlInput, flex: '1 1 160px', minWidth: 140 }} />
        <select aria-label="Filter by plan" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={{ ...stlInput, flex: '0 1 auto' }}>
          <option value="all">All plans</option>
          {catalogPlans.map((p) => <option key={p.code} value={p.name}>{p.name}</option>)}
        </select>
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...stlInput, flex: '0 1 auto' }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <style>{`
        .sf-tenant-card { transition: box-shadow .2s, transform .2s; cursor: pointer; }
        .sf-tenant-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-tenant-card:active { transform: scale(.98); }
        .sf-drawer { transition: transform .25s cubic-bezier(.22,1,.36,1); }
        .sf-drawer-overlay { transition: opacity .2s; }
        @media (prefers-reduced-motion: reduce) {
          .sf-tenant-card, .sf-drawer, .sf-drawer-overlay { transition: none; }
          .sf-tenant-card:hover, .sf-tenant-card:active { transform: none; }
        }
      `}</style>

      {/* Tenant cards */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 12 : 20 }}>
        {rows.length === 0 ? (
          <div style={{ padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No stores match your filters.</p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>Try adjusting search, plan, or status.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {rows.map((t) => (
              <div key={t.id} className="sf-tenant-card" onClick={() => { setSelected(t); setTab('overview'); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { setSelected(t); setTab('overview'); } }}
                style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: isMobile ? 14 : 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, marginBottom: 10 }}>
                    <div style={{ width: isMobile ? 38 : 40, height: isMobile ? 38 : 40, borderRadius: 10, background: t.color, color: '#f4f4f1', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 13 : 14, fontWeight: 800, flexShrink: 0 }}>{t.initials}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: isMobile ? 14 : 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                      <div style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>{t.owner} · {t.type}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 10 : 12, flexWrap: 'wrap' }}>
                    <Badge tone={t.plan === 'Free' ? 'grey' : t.plan === 'Pro' ? 'amber' : 'blue'}>{t.plan}</Badge>
                    <Badge tone={t.status === 'active' ? 'green' : 'red'}>{t.status === 'active' ? 'Active' : 'Suspended'}</Badge>
                    <Badge tone="grey">{t.users} user{t.users !== 1 ? 's' : ''}</Badge>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: isMobile ? 13 : 13, fontWeight: 700, color: 'var(--ink)' }}>{money(t.salesMtd)} <span style={{ fontWeight: 400, color: 'var(--ink-faint)', fontSize: isMobile ? 10.5 : 11 }}>MTD</span></span>
                    <span style={{ fontSize: isMobile ? 11 : 11.5, color: 'var(--ink-faint)' }}>Click to manage →</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 0, borderTop: '1px solid var(--line-soft)', background: 'var(--paper)' }}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onSuspend(t); }}
                    style={{ flex: 1, padding: isMobile ? '10px 0' : '8px 0', fontSize: isMobile ? 12.5 : 12, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: t.status === 'active' ? 'var(--red)' : 'var(--green)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onMouseEnter={(e2) => e2.currentTarget.style.background = 'var(--paper-dim)'}
                    onMouseLeave={(e2) => e2.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {t.status === 'active' ? <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                    {t.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  <div style={{ width: 1, background: 'var(--line-soft)' }} />
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(t); }}
                    style={{ flex: 1, padding: isMobile ? '10px 0' : '8px 0', fontSize: isMobile ? 12.5 : 12, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--red)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onMouseEnter={(e2) => e2.currentTarget.style.background = 'var(--red-soft)'}
                    onMouseLeave={(e2) => e2.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer overlay */}
      {selected && (
        <div className="sf-drawer-overlay" onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 999 }} />
      )}

      {/* Drawer */}
      <div ref={drawerRef} className="sf-drawer" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: isMobile ? '100%' : 520, background: 'var(--card)', zIndex: 1000,
        boxShadow: '-4px 0 32px rgba(0,0,0,.12)', overflow: 'auto',
        transform: selected ? 'translateX(0)' : 'translateX(100%)',
      }}>
        {selected && (
          <>
            {/* Drawer header */}
            <div style={{ padding: isMobile ? '16px 18px' : '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: selected.color, color: '#f4f4f1', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{selected.initials}</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: isMobile ? 16 : 17, fontWeight: 700, color: 'var(--ink)' }}>{selected.name}</h3>
                    <p style={{ margin: '1px 0 0', fontSize: isMobile ? 12 : 12.5, color: 'var(--ink-soft)' }}>{selected.owner} · {selected.type}</p>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 4px', background: 'var(--paper)' }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'staff', label: 'Staff' },
                { id: 'activity', label: 'Activity' },
                { id: 'plan', label: 'Plan' },
              ].map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                  style={{ flex: 1, padding: isMobile ? '12px 6px' : '11px 12px', fontSize: isMobile ? 12.5 : 12.5, fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer', color: tab === t.id ? 'var(--ink)' : 'var(--ink-faint)', fontFamily: 'inherit', borderBottom: tab === t.id ? '2px solid var(--ink)' : '2px solid transparent', transition: 'color .15s' }}
                >{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: isMobile ? 16 : 20 }}>
              {tab === 'overview' && (
                <OverviewTab tenant={selected} isMobile={isMobile} />
              )}
              {tab === 'staff' && (
                <StaffTab tenant={selected} users={users} isMobile={isMobile} />
              )}
              {tab === 'activity' && (
                <ActivityTab tenantName={selected.name} isMobile={isMobile} />
              )}
              {tab === 'plan' && (
                <PlanTab tenant={selected} isMobile={isMobile} plans={catalogPlans} onPlanChange={onPlanChange} />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ---------- Tab components ---------- */

function OverviewTab({ tenant, isMobile }: { tenant: Tenant; isMobile: boolean }) {
  const storeSessions = (sessionsData as { user: string; ip: string; device: string; started: string }[]).filter((s) => s.user === tenant.owner);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Staff users', value: tenant.users, color: 'var(--ink)' },
          { label: 'Sales (MTD)', value: money(tenant.salesMtd), color: 'var(--green)' },
          { label: 'Active sessions', value: storeSessions.length, color: 'var(--blue-deep)' },
          { label: 'Avg per user', value: tenant.users > 0 ? money(Math.round(tenant.salesMtd / tenant.users)) : '$0', color: 'var(--amber)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 17 : 18, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? 14 : 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Detail info</h4>
        {[
          { label: 'Store ID', value: tenant.id },
          { label: 'Owner', value: tenant.owner },
          { label: 'Type', value: tenant.type },
          { label: 'Plan', value: tenant.plan },
          { label: 'Status', value: tenant.status === 'active' ? 'Active' : 'Suspended' },
        ].map((r) => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line-soft)', fontSize: isMobile ? 13 : 13 }}>
            <span style={{ color: 'var(--ink-faint)' }}>{r.label}</span>
            <span style={{ fontWeight: 600, color: r.label === 'Status' ? statusColor(tenant.status) : 'var(--ink)' }}>{r.value}</span>
          </div>
        ))}
      </div>

      {storeSessions.length > 0 && (
        <div style={{ marginTop: 12, background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? 14 : 16 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Active sessions</h4>
          {storeSessions.map((s) => (
            <div key={s.ip + s.device} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--line-soft)', fontSize: isMobile ? 12.5 : 12.5 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.device}</div>
                <div style={{ color: 'var(--ink-faint)', fontSize: isMobile ? 11.5 : 11.5 }}>{s.ip}</div>
              </div>
              <span style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{s.started}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffTab({ tenant, users, isMobile }: { tenant: Tenant; users: { name: string; email: string; role: string; status: string; lastActive: string; store: string }[]; isMobile: boolean }) {
  const storeUsers = users.filter((u) => u.store === tenant.name);

  return (
    <div>
      {storeUsers.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>No staff found for this store.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {storeUsers.map((u) => (
            <div key={u.email} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '12px 14px' : '12px 16px', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: u.role === 'Platform admin' ? '#6a5d78' : u.role === 'Owner' ? '#a8731d' : u.role === 'Manager' ? '#131312' : '#85857e', color: '#f4f4f1', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {u.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 13.5 : 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                <div className="mono" style={{ fontSize: isMobile ? 11.5 : 11.5, color: 'var(--ink-faint)' }}>{u.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Badge tone={u.role === 'Owner' ? 'amber' : u.role === 'Manager' ? 'blue' : 'grey'}>{u.role === 'Platform admin' ? 'Admin' : u.role}</Badge>
                <div style={{ fontSize: isMobile ? 10.5 : 11, color: u.status === 'active' ? 'var(--green)' : 'var(--red)', fontWeight: 600, marginTop: 2 }}>{u.status === 'active' ? 'Active' : 'Disabled'} · {u.lastActive}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTab({ tenantName, isMobile }: { tenantName: string; isMobile: boolean }) {
  const entries = (auditLog as { id: string; time: string; actor: string; action: string; target: string; ip: string; kind: string }[])
    .filter((e) => e.target.includes(tenantName.split(' ')[0]))
    .slice(0, 10);

  const actionLabel = (a: string) => a.replace(/\./g, ' · ').replace(/_/g, ' ');

  return (
    <div>
      {entries.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
          No activity logged for this store yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map((e) => (
            <div key={e.id} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '12px 14px' : '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>{actionLabel(e.action)}</span>
                <span style={{ fontSize: isMobile ? 11 : 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{e.time}</span>
              </div>
              <div style={{ fontSize: isMobile ? 12 : 11.5, color: 'var(--ink-soft)' }}>
                By <strong>{e.actor}</strong> · target: {e.target} · <span className="mono">{e.ip}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanTab({ tenant, isMobile, plans, onPlanChange }: {
  tenant: Tenant;
  isMobile: boolean;
  plans: CatalogPlan[];
  onPlanChange: (id: string, planCode: string) => void;
}) {
  const current = plans.find((p) => p.name === tenant.plan);
  const features = planFeatureList(current);
  const priceLabel = current
    ? current.billing.monthlyPriceMinor === 0
      ? 'Free'
      : `$${(current.billing.monthlyPriceMinor / 100).toFixed(2)}/mo`
    : null;
  return (
    <div>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? 14 : 16, marginBottom: 14 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Current plan</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Badge tone={current && current.billing.monthlyPriceMinor > 0 ? 'amber' : 'grey'}>{tenant.plan}</Badge>
          {priceLabel && <span style={{ fontSize: isMobile ? 12.5 : 13, fontWeight: 700, color: 'var(--ink)' }}>{priceLabel}</span>}
          <span style={{ fontSize: isMobile ? 12.5 : 13, color: 'var(--ink-soft)' }}>{money(tenant.salesMtd)} MTD · {tenant.users} users</span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>Features included:</div>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {features.length === 0 && (
            <li style={{ padding: '5px 0', fontSize: 12.5, color: 'var(--ink-faint)' }}>Plan details unavailable.</li>
          )}
          {features.map((f) => (
            <li key={f} style={{ padding: '5px 0', fontSize: isMobile ? 12.5 : 12.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? 14 : 16 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Change plan</h4>
        <p style={{ margin: '0 0 12px', fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>
          Applies to the owner's billing subscription immediately. Downgrades are
          blocked while the store's usage exceeds the target plan's limits.
        </p>
        <select aria-label="Select plan" value={current?.code ?? ''} onChange={(e) => onPlanChange(tenant.id, e.target.value)}
          style={{ width: '100%', padding: isMobile ? '12px 14px' : '11px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, background: 'var(--card)', color: 'var(--ink)' }}>
          {!current && <option value="" disabled>Select plan…</option>}
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}{p.billing.monthlyPriceMinor > 0 ? ` — $${(p.billing.monthlyPriceMinor / 100).toFixed(0)}/mo` : ' — Free'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
