import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, Modal, toast } from '@/components/ui';
import { subscriptionService, type PlanInfo, type ChangePreview } from '@/features/subscriptions/subscriptionService';
import { usePlanLimits } from '@/features/subscriptions/usePlanLimits';
import { billingService } from '@/features/billing/billingService';
import { errorMessage } from '@/lib/http/errors';
import { money } from '@/lib/format';

const FEATURE_LABELS: Record<string, string> = {
  analytics: 'Basic analytics',
  advancedAnalytics: 'Advanced analytics & reports',
  exportReports: 'Export reports (CSV)',
  customBranding: 'Custom branding',
  multiStore: 'Multi-store support',
  inventoryManagement: 'Inventory management',
  employeeManagement: 'Employee management',
  discountManagement: 'Discount & promotions',
  integrations: 'Supplier & purchase orders',
  apiAccess: 'API access',
  prioritySupport: 'Priority support',
  auditLogs: 'Audit logs',
};

const LIMIT_LABELS: Record<string, string> = {
  productsPerStore: 'Products',
  membersPerStore: 'Staff',
  customersPerStore: 'Customers',
  stores: 'Stores',
  ordersPerMonth: 'Orders / month',
  inventoryLocations: 'Inventory locations',
  apiRequestsPerMonth: 'API requests / month',
};

const LIMIT_ORDER = ['productsPerStore', 'membersPerStore', 'customersPerStore', 'ordersPerMonth', 'stores', 'inventoryLocations', 'apiRequestsPerMonth'];

const PLAN_BADGES: Record<string, { color: string; label: string }> = {
  pro: { color: 'var(--blue)', label: 'Most popular' },
  enterprise: { color: 'var(--green)', label: 'Best value' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Active', bg: 'var(--green-soft)', color: 'var(--green-deep)' },
  trialing: { label: 'Trial', bg: 'var(--blue-soft)', color: 'var(--blue)' },
  past_due: { label: 'Past due', bg: 'var(--red-soft)', color: 'var(--red-deep)' },
  grace_period: { label: 'Grace period', bg: 'var(--amber-soft)', color: 'var(--amber)' },
  incomplete: { label: 'Incomplete', bg: 'var(--amber-soft)', color: 'var(--amber)' },
  pending: { label: 'Pending', bg: 'var(--blue-soft)', color: 'var(--blue)' },
  suspended: { label: 'Suspended', bg: 'var(--red-soft)', color: 'var(--red-deep)' },
  cancelled: { label: 'Cancelled', bg: 'var(--paper)', color: 'var(--ink-faint)' },
  expired: { label: 'Expired', bg: 'var(--paper)', color: 'var(--ink-faint)' },
};

const defaultStatus = { label: 'Unknown', bg: 'var(--paper)', color: 'var(--ink-faint)' };

/** Where to send the user to resolve each kind of over-limit conflict. */
const CONFLICT_ROUTES: Record<string, { to: string; cta: string }> = {
  membersPerStore: { to: '/employees', cta: 'Manage staff' },
  productsPerStore: { to: '/products', cta: 'Manage products' },
  customersPerStore: { to: '/customers', cta: 'Manage customers' },
  stores: { to: '/settings', cta: 'Manage stores' },
};

function formatMinor(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '$0.00';
  return money(amount / 100);
}

function UsageMeter({ used, limit, label }: { used: number; limit: number; label: string }) {
  const isUnlimited = limit < 0 || limit >= 999999999;
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const display = isUnlimited ? `${used.toLocaleString()} / Unlimited` : `${used.toLocaleString()} / ${limit.toLocaleString()}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>
        <span style={{ fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{display}</span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 6, borderRadius: 3, background: 'var(--paper)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: pct > 90 ? 'var(--red)' : 'var(--blue)', transition: 'width .3s ease' }} />
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, currentPlanCode, onSelect, billingInterval }: {
  plan: PlanInfo;
  currentPlanCode: string | null;
  onSelect: (code: string, interval: 'monthly' | 'yearly') => void;
  billingInterval: 'monthly' | 'yearly';
}) {
  const isCurrent = plan.code === currentPlanCode;
  const badge = PLAN_BADGES[plan.code];
  const price = billingInterval === 'yearly' ? (plan.billing?.yearlyPriceMinor ?? 0) : (plan.billing?.monthlyPriceMinor ?? 0);
  const priceLabel = price === 0 ? 'Free' : `${formatMinor(price)}/${billingInterval === 'yearly' ? 'yr' : 'mo'}`;

  return (
    <div style={{
      background: isCurrent ? 'var(--paper)' : 'var(--card)',
      border: `1px solid ${isCurrent ? 'var(--blue)' : 'var(--line)'}`,
      borderRadius: 16,
      boxShadow: isCurrent ? '0 0 0 2px var(--blue), 0 8px 24px -8px rgba(0,0,0,0.12)' : 'none',
      padding: 24,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      opacity: isCurrent ? 1 : 0.92,
      transition: 'opacity .15s, box-shadow .15s',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: badge.color, color: '#fff', fontSize: 10.5, fontWeight: 700,
          padding: '4px 14px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.04em',
        }}>
          {badge.label}
        </div>
      )}

      <div style={{
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em',
        color: isCurrent ? 'var(--blue)' : 'var(--ink-faint)',
        fontWeight: 700, marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {isCurrent && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--blue)' }}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        )}
        {isCurrent ? 'Your plan' : plan.name}
      </div>
      <h3 className="display" style={{
        margin: '0 0 2px', fontSize: isCurrent ? 24 : 20, fontWeight: 800,
        color: 'var(--ink)',
      }}>
        {plan.name}
        {isCurrent && (
          <span style={{
            display: 'inline-block', marginLeft: 8, padding: '2px 8px', borderRadius: 6,
            background: 'var(--blue-soft)', color: 'var(--blue)', fontSize: 10, fontWeight: 700,
            verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            Selected
          </span>
        )}
      </h3>
      <div style={{ fontSize: isCurrent ? 32 : 28, fontWeight: 800, color: 'var(--ink)', margin: '8px 0 4px' }}>
        {priceLabel}
      </div>
      {plan.code !== 'free' && plan.billing && (
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 12 }}>
          {formatMinor(plan.billing.monthlyPriceMinor)}/mo billed{' '}
          {billingInterval === 'yearly' ? 'yearly' : 'monthly'}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.4 }}>
        {plan.description}
      </div>

      <div style={{ flex: 1 }}>
        {Object.entries(FEATURE_LABELS).map(([key, label]) => {
          const enabled = plan.features[key as keyof typeof plan.features] === true;
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 0', fontSize: 12.5, color: enabled ? 'var(--ink)' : 'var(--ink-faint)',
              opacity: enabled ? 1 : 0.5,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={enabled ? 'var(--green)' : 'var(--ink-faint)'}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                {enabled ? (
                  <polyline points="20 6 9 17 4 12" />
                ) : (
                  <line x1="18" y1="6" x2="6" y2="18" />
                )}
              </svg>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {!isCurrent && (
        <Button
          onClick={() => onSelect(plan.code, billingInterval)}
          fullWidth
          style={{ marginTop: 16, justifyContent: 'center' }}
          variant={price === 0 ? 'ghost' : 'primary'}
        >
          {price === 0 ? 'Downgrade to Free' : `Choose ${plan.name}`}
        </Button>
      )}
      {isCurrent && (
        <div style={{
          marginTop: 16, padding: '10px', textAlign: 'center',
          borderRadius: 8, background: 'var(--blue-soft)', border: '1px solid var(--blue-border)',
          fontSize: 12, fontWeight: 600, color: 'var(--blue)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Plan selected
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const { data: limits, refetch: refetchLimits } = usePlanLimits();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [confirmModal, setConfirmModal] = useState<{ plan: PlanInfo; interval: 'monthly' | 'yearly' } | null>(null);
  const [changing, setChanging] = useState(false);
  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const currentPlanCode = limits?.plan?.code ?? null;
  const currentPlanName = limits?.plan?.name ?? 'Free';
  const currentFeatures = limits?.features;
  const currentLimits = limits?.limits;
  const currentCounts = limits?.currentCounts;
  const subscriptionStatus = limits?.subscriptionStatus ?? null;
  const cancelAtPeriodEnd = limits?.cancelAtPeriodEnd ?? false;

  useEffect(() => {
    subscriptionService.listPlans()
      .then(setPlans)
      .catch(() => toast.error('Could not load plans'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (code: string, interval: 'monthly' | 'yearly') => {
    const plan = plans.find((p) => p.code === code);
    if (!plan) return;
    setConfirmModal({ plan, interval });
    // Pre-flight: usage-vs-limits conflicts and feature changes for this switch.
    setPreview(null);
    setPreviewLoading(true);
    subscriptionService.previewChange(code, interval)
      .then(setPreview)
      .catch(() => setPreview(null)) // preview is advisory; the server still enforces
      .finally(() => setPreviewLoading(false));
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    setChanging(true);
    try {
      const res = await subscriptionService.changePlan(confirmModal.plan.code, confirmModal.interval);
      toast.success(res?.message ?? 'Plan changed successfully');
      setConfirmModal(null);
      refetchLimits();
    } catch (e) {
      toast.error(errorMessage(e, 'Could not change plan'));
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: isMobile ? 16 : 20 }}>
        <div style={{ height: 22, width: 200, background: 'var(--line-soft)', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 200, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--line-soft)' }} />
      </div>
    );
  }

  const sortedPlans = [...plans]
    .filter((p) => p.billing && typeof p.billing.monthlyPriceMinor === 'number')
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Billing &amp; plan</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>
            Manage your subscription and usage
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/settings')} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>
          ← Store settings
        </Button>
      </div>

      {/* Current plan hero */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
        padding: isMobile ? 20 : 28, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-faint)' }}>
                Current plan
              </span>
              {(() => {
                const cfg = STATUS_CONFIG[limits?.subscriptionStatus ?? ''] ?? defaultStatus;
                return (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                );
              })()}
            </div>
            <h3 className="display" style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
              {currentPlanName}
            </h3>
            {(() => {
              // Prefer the real subscription record (what the account is
              // actually billed) over the plan's list price.
              const p = plans.find((x) => x.code === currentPlanCode);
              const amount = limits?.amountMinor ?? p?.billing.monthlyPriceMinor ?? 0;
              const interval = limits?.billingInterval ?? 'monthly';
              const periodEnd = limits?.currentPeriodEnd ? new Date(limits.currentPeriodEnd) : null;
              const renewalLabel = periodEnd
                ? periodEnd.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                : null;
              return (
                <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ink-soft)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 20 }}>{formatMinor(amount)}</span>
                  /{interval === 'yearly' ? 'year' : 'month'}
                  {renewalLabel && amount > 0 && (
                    <div style={{ marginTop: 6, fontSize: 12.5, color: cancelAtPeriodEnd ? 'var(--red)' : 'var(--ink-soft)' }}>
                      {cancelAtPeriodEnd
                        ? `Cancellation scheduled — access ends on ${renewalLabel}`
                        : `Renews on ${renewalLabel}`}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Usage meters */}
        {currentLimits && currentCounts && (
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 20 }}>
            {LIMIT_ORDER.map((key) => {
              const limit = currentLimits[key as keyof typeof currentLimits];
              const used = currentCounts[key as keyof typeof currentCounts];
              if (limit == null || used == null) return null;
              return (
                <UsageMeter key={key} label={LIMIT_LABELS[key] || key} used={used} limit={limit} />
              );
            })}
          </div>
        )}

        {/* Features */}
        {currentFeatures && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-faint)', marginBottom: 12 }}>
              What's included
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '6px 24px' }}>
              {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                const enabled = currentFeatures[key as keyof typeof currentFeatures] === true;
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                    fontSize: 13, color: enabled ? 'var(--ink)' : 'var(--ink-faint)',
                    opacity: enabled ? 1 : 0.45,
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={enabled ? 'var(--green)' : 'var(--ink-faint)'}
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}
                    >
                      {enabled ? <polyline points="20 6 9 17 4 12" /> : <line x1="18" y1="6" x2="6" y2="18" />}
                    </svg>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Manage subscription actions */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            onClick={async () => {
              try {
                const portal = await billingService.createPortalSession(window.location.href);
                window.location.href = portal.url;
              } catch (e) {
                toast.error(errorMessage(e, 'Could not open billing portal'));
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Payment method
          </Button>

          <Link to="/settings/billing/invoices" style={{ textDecoration: 'none' }}>
            <Button variant="ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Invoices
            </Button>
          </Link>

          {subscriptionStatus === 'active' && !cancelAtPeriodEnd && (
            <Link to="/settings/billing/cancel" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" style={{ color: 'var(--red)' }}>
                Cancel subscription
              </Button>
            </Link>
          )}

          {cancelAtPeriodEnd && (
            <Button
              variant="ghost"
              style={{ color: 'var(--green)' }}
              onClick={async () => {
                try {
                  const res = await billingService.reactivateSubscription();
                  toast.success(res?.message ?? 'Subscription reactivated');
                  refetchLimits();
                } catch (e) {
                  toast.error(errorMessage(e, 'Could not reactivate'));
                }
              }}
            >
              Reactivate subscription
            </Button>
          )}
        </div>
      </div>

      {/* All plans */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h4 className="display" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Compare plans</h4>
          <div style={{
            display: 'flex', gap: 3, padding: 2, borderRadius: 8, background: 'var(--paper)',
            border: '1px solid var(--line-soft)',
          }}>
            {(['monthly', 'yearly'] as const).map((interval) => (
              <button
                key={interval}
                type="button"
                onClick={() => setBillingInterval(interval)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: billingInterval === interval ? 'var(--card)' : 'transparent',
                  color: billingInterval === interval ? 'var(--ink)' : 'var(--ink-faint)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: billingInterval === interval ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {interval === 'monthly' ? 'Monthly' : 'Yearly'}
                {interval === 'yearly' && (
                  <span style={{ color: 'var(--green)', fontSize: 9.5, fontWeight: 700, marginLeft: 3 }}>−20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: isMobile ? 14 : 16,
        }}>
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.code}
              plan={plan}
              currentPlanCode={currentPlanCode}
              onSelect={handleSelect}
              billingInterval={billingInterval}
            />
          ))}
        </div>
      </div>

      {/* Confirm change modal */}
      <Modal open={!!confirmModal} onClose={() => { if (!changing) setConfirmModal(null); }} title="Change plan">
        {confirmModal && (() => {
          const conflicts = preview?.limitConflicts ?? [];
          const blocked = conflicts.length > 0;
          const lostFeatures = (preview?.featuresRemoved ?? [])
            .map((k) => FEATURE_LABELS[k])
            .filter(Boolean);
          return (
            <div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>
                You're about to switch from <strong>{currentPlanName}</strong> to{' '}
                <strong>{confirmModal.plan.name}</strong> ({confirmModal.interval}).
              </p>

              {previewLoading && (
                <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 14 }}>
                  Checking your usage against the {confirmModal.plan.name} plan…
                </div>
              )}

              {/* Over-limit conflicts: the switch is blocked until resolved.
                  Nothing is ever deleted automatically. */}
              {blocked && (
                <div style={{
                  padding: 14, borderRadius: 10, background: 'var(--red-soft)',
                  border: '1px solid var(--red)', marginBottom: 14, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)',
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    Your usage exceeds the {confirmModal.plan.name} plan's limits
                  </div>
                  {conflicts.map((c) => {
                    const route = CONFLICT_ROUTES[c.metric];
                    const excess = c.current - c.allowed;
                    return (
                      <div key={c.metric} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--red-soft)' }}>
                        <div style={{ flex: 1 }}>
                          <strong>{c.label}:</strong> {c.current.toLocaleString()} in use, {c.allowed.toLocaleString()} allowed
                          {' '}— remove {excess.toLocaleString()} to continue
                        </div>
                        {route && (
                          <Link to={route.to} style={{ fontSize: 12, fontWeight: 700, color: 'var(--red-deep)', whiteSpace: 'nowrap' }}>
                            {route.cta} →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-soft)' }}>
                    Nothing is deleted automatically — reduce usage, then come back and switch.
                  </div>
                </div>
              )}

              {/* Features lost on this switch (informational, doesn't block). */}
              {!blocked && lostFeatures.length > 0 && (
                <div style={{
                  padding: 14, borderRadius: 10, background: 'var(--amber-soft)',
                  border: '1px solid var(--amber)', marginBottom: 14, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink)',
                }}>
                  <strong>You'll lose access to:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    {lostFeatures.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}

              {!blocked && (
                <div style={{
                  padding: 14, borderRadius: 10, background: 'var(--paper)',
                  border: '1px solid var(--line)', marginBottom: 14, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink)',
                }}>
                  Changing plans immediately updates your limits and features.
                  Your data always stays intact.
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => setConfirmModal(null)} disabled={changing} style={{ flex: 1, justifyContent: 'center' }}>
                  {blocked ? 'Close' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleConfirm}
                  isLoading={changing}
                  disabled={previewLoading || blocked}
                  style={{ flex: 2, justifyContent: 'center', opacity: previewLoading || blocked ? 0.5 : 1 }}
                >
                  Switch to {confirmModal.plan.name}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
