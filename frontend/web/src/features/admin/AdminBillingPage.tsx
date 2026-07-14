import { useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { errorMessage } from '@/lib/http/errors';
import { Button, confirmDialog, toast, Spinner } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';

function fmtDate(d: string | Date): string {
  const date = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function fmtDateTime(d: string | Date): string {
  const date = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${h > 12 ? h - 12 : h || 12}:${m}${h >= 12 ? 'pm' : 'am'}`;
}

interface PlanRef {
  _id: string;
  name: string;
  code: string;
}

interface Subscription {
  _id: string;
  publicId: string;
  status: string;
  billingInterval: string;
  amountMinor: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: PlanRef | null;
  account: { _id: string; owner: string } | null;
  provider: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface BillingAccount {
  _id: string;
  owner: { _id: string; name: string; email: string } | null;
  createdAt: string;
  latestSubscription?: { _id: string; status: string; plan: { name: string; code: string } | null } | null;
}

type Tab = 'subscriptions' | 'accounts';

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--green)',
  trialing: 'var(--blue)',
  past_due: 'var(--amber)',
  suspended: 'var(--red)',
  canceled: 'var(--grey)',
  expired: 'var(--grey)',
  incomplete: 'var(--amber)',
  incomplete_expired: 'var(--red)',
};

function currencySymbol(c: string) {
  if (c === 'usd') return '$';
  if (c === 'eur') return '\u20AC';
  if (c === 'gbp') return '\u00A3';
  return `${c} `;
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? 'var(--grey)';
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: `${color}20`, color,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

async function apiGet<T>(url: string): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await api.get(url);
    return { ok: true, data: res.data?.data ?? res.data };
  } catch (e) {
    return { ok: false, error: errorMessage(e, 'Request failed') };
  }
}

async function apiPost(url: string, body?: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await api.post(url, body);
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, error: errorMessage(e, 'Request failed') };
  }
}

export default function AdminBillingPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'subscriptions';
  const setTab = (t: Tab) => setSearchParams({ tab: t });

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Subscription | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ userId: '', planCode: '', billingInterval: 'monthly', reason: '' });
  const [plans, setPlans] = useState<{ code: string; name: string }[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    (async () => {
      const res = await apiGet<{ code: string; name: string }[]>('/plans');
      if (res.data) setPlans(Array.isArray(res.data) ? res.data : []);
    })();
  }, []);

  const loadSubscriptions = useCallback(async (status?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    const res = await apiGet<Subscription[]>(`/admin/billing/subscriptions?${params}`);
    if (res.data) setSubscriptions(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const res = await apiGet<BillingAccount[]>(`/admin/billing/accounts`);
    if (res.data) setAccounts(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'subscriptions') loadSubscriptions(statusFilter);
    else loadAccounts();
  }, [tab, loadSubscriptions, loadAccounts, statusFilter]);

  const openDetail = (sub: Subscription) => { setDetail(sub); setShowModal(true); };

  const handleSuspend = async (id: string) => {
    const ok = await confirmDialog('Suspend this subscription? This will block store access.');
    if (!ok) return;
    const res = await apiPost(`/admin/billing/subscriptions/${id}/suspend`, { reason: 'Admin suspension' });
    if (res.ok) { toast('Subscription suspended'); loadSubscriptions(statusFilter); }
    else toast(res.error ?? 'Failed');
  };

  const handleReactivate = async (id: string) => {
    const ok = await confirmDialog('Reactivate this subscription? This will restore store access.');
    if (!ok) return;
    const res = await apiPost(`/admin/billing/subscriptions/${id}/reactivate`, { reason: 'Admin reactivation' });
    if (res.ok) { toast('Subscription reactivated'); loadSubscriptions(statusFilter); }
    else toast(res.error ?? 'Failed');
  };

  const handleManualCreate = async () => {
    if (!manualForm.userId || !manualForm.planCode) return toast('User ID and plan are required');
    const res = await apiPost('/admin/billing/manual-subscription', manualForm);
    if (res.ok) {
      toast('Manual subscription created');
      setManualOpen(false);
      setManualForm({ userId: '', planCode: '', billingInterval: 'monthly', reason: '' });
      loadSubscriptions(statusFilter);
    } else toast(res.error ?? 'Failed');
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Billing controls</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'subscriptions' && (
            <Button variant="ghost" onClick={() => setManualOpen(true)}>Manual subscription</Button>
          )}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-subtle)', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setTab('subscriptions')}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: tab === 'subscriptions' ? 'var(--bg)' : 'transparent',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
              Subscriptions
            </button>
            <button onClick={() => setTab('accounts')}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: tab === 'accounts' ? 'var(--bg)' : 'transparent',
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>
              Accounts
            </button>
          </div>
        </div>
      </div>

      {tab === 'subscriptions' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13, background: 'var(--bg)' }}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="trialing">Trialing</option>
              <option value="past_due">Past due</option>
              <option value="suspended">Suspended</option>
              <option value="canceled">Canceled</option>
              <option value="expired">Expired</option>
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{subscriptions.length} subscriptions</span>
          </div>

          {loading ? <Spinner /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>ID</th>
                    <th style={{ padding: '8px 12px' }}>Plan</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Interval</th>
                    <th style={{ padding: '8px 12px' }}>Amount</th>
                    <th style={{ padding: '8px 12px' }}>Provider</th>
                    <th style={{ padding: '8px 12px' }}>Period end</th>
                    <th style={{ padding: '8px 12px' }}>Created</th>
                    <th style={{ padding: '8px 12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s._id} style={{ borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }}
                      onClick={() => openDetail(s)}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{s.publicId}</td>
                      <td style={{ padding: '10px 12px' }}>{s.plan?.name ?? '\u2014'}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={s.status} /></td>
                      <td style={{ padding: '10px 12px' }}>{s.billingInterval}</td>
                      <td style={{ padding: '10px 12px' }}>{currencySymbol(s.currency)}{(s.amountMinor / 100).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{s.provider}</td>
                      <td style={{ padding: '10px 12px' }}>{s.currentPeriodEnd ? fmtDate(s.currentPeriodEnd) : '\u2014'}</td>
                      <td style={{ padding: '10px 12px' }}>{fmtDate(s.createdAt)}</td>
                      <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(s.status === 'active' || s.status === 'past_due') && (
                            <Button variant="ghost" size="sm" onClick={() => handleSuspend(s._id)} style={{ color: 'var(--red)' }}>Suspend</Button>
                          )}
                          {(s.status === 'suspended' || s.status === 'canceled') && (
                            <Button variant="ghost" size="sm" onClick={() => handleReactivate(s._id)} style={{ color: 'var(--green)' }}>Reactivate</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {subscriptions.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No subscriptions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'accounts' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>{accounts.length} billing accounts</p>
          {loading ? <Spinner /> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Owner</th>
                    <th style={{ padding: '8px 12px' }}>Email</th>
                    <th style={{ padding: '8px 12px' }}>Latest plan</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a._id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.owner?.name ?? '\u2014'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{a.owner?.email ?? '\u2014'}</td>
                      <td style={{ padding: '10px 12px' }}>{a.latestSubscription?.plan?.name ?? '\u2014'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {a.latestSubscription ? <StatusBadge status={a.latestSubscription.status} /> : '\u2014'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{fmtDate(a.createdAt)}</td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No accounts found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showModal && detail && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg)', borderRadius: 12, padding: 24,
            minWidth: isMobile ? '90%' : 480, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Subscription {detail.publicId}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 12px', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Plan</span>
              <span>{detail.plan?.name ?? '\u2014'} ({detail.plan?.code ?? '\u2014'})</span>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <span><StatusBadge status={detail.status} /></span>
              <span style={{ color: 'var(--text-muted)' }}>Interval</span>
              <span>{detail.billingInterval}</span>
              <span style={{ color: 'var(--text-muted)' }}>Amount</span>
              <span>{currencySymbol(detail.currency)}{(detail.amountMinor / 100).toFixed(2)}</span>
              <span style={{ color: 'var(--text-muted)' }}>Provider</span>
              <span>{detail.provider}</span>
              <span style={{ color: 'var(--text-muted)' }}>Period start</span>
              <span>{detail.currentPeriodStart ? fmtDate(detail.currentPeriodStart) : '\u2014'}</span>
              <span style={{ color: 'var(--text-muted)' }}>Period end</span>
              <span>{detail.currentPeriodEnd ? fmtDate(detail.currentPeriodEnd) : '\u2014'}</span>
              <span style={{ color: 'var(--text-muted)' }}>Created</span>
              <span>{fmtDateTime(detail.createdAt)}</span>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setShowModal(false)}>Close</Button>
              {(detail.status === 'active' || detail.status === 'past_due') && (
                <Button onClick={() => { setShowModal(false); handleSuspend(detail._id); }}
                  style={{ background: 'var(--red)', color: '#fff' }}>Suspend</Button>
              )}
              {(detail.status === 'suspended' || detail.status === 'canceled') && (
                <Button onClick={() => { setShowModal(false); handleReactivate(detail._id); }}
                  style={{ background: 'var(--green)', color: '#fff' }}>Reactivate</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {manualOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--bg)', borderRadius: 12, padding: 24,
            minWidth: isMobile ? '90%' : 400,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Create manual subscription</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="User ID" value={manualForm.userId}
                onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13 }} />
              <select value={manualForm.planCode}
                onChange={(e) => setManualForm({ ...manualForm, planCode: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13, background: 'var(--bg)' }}>
                <option value="">Select plan</option>
                {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
              <select value={manualForm.billingInterval}
                onChange={(e) => setManualForm({ ...manualForm, billingInterval: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13, background: 'var(--bg)' }}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input placeholder="Reason (optional)" value={manualForm.reason}
                onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13 }} />
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setManualOpen(false)}>Cancel</Button>
              <Button onClick={handleManualCreate}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
