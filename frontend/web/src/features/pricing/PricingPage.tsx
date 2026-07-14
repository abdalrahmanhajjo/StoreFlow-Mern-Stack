import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { Logo, Button } from '@/components/ui';

interface PricingPlan {
  publicId: string;
  code: string;
  name: string;
  description: string;
  shortDescription: string;
  isRecommended: boolean;
  displayOrder: number;
  supportedIntervals: Array<'monthly' | 'yearly'>;
  billing: { currency: string; monthlyPriceMinor: number; yearlyPriceMinor: number };
  features: Record<string, boolean>;
  limits: Record<string, number>;
  trial: { enabled: boolean; durationDays: number };
}

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
  stores: 'Stores',
  membersPerStore: 'Staff per store',
  productsPerStore: 'Products',
  ordersPerMonth: 'Monthly orders',
  customersPerStore: 'Customers',
};

function formatMinor(amount: number): string {
  return '$' + (amount / 100).toFixed(2);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(0) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toLocaleString();
}

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const preselectedInterval = searchParams.get('interval') as 'monthly' | 'yearly' | null;
  const [interval, setInterval] = useState<'monthly' | 'yearly'>(
    preselectedInterval === 'monthly' || preselectedInterval === 'yearly' ? preselectedInterval : 'monthly'
  );
  useEffect(() => {
    api.get('/v1/billing/plans')
      .then((res) => {
        const data: PricingPlan[] = res.data?.data ?? res.data ?? [];
        setPlans(data.sort((a, b) => a.displayOrder - b.displayOrder));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--paper)',
      fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 24px', maxWidth: 1100, margin: '0 auto',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <Logo size={28} />
          <span style={{ fontSize: 16, fontWeight: 700 }}>StoreFlow</span>
        </Link>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
            Sign in
          </Link>
          <Link to="/register">
            <Button variant="primary" style={{ padding: '8px 18px', fontSize: 13 }}>
              Get started
            </Button>
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--ink)', margin: '0 0 8px' }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-soft)', maxWidth: 500, margin: '0 auto', lineHeight: 1.5 }}>
            Start free. Upgrade when you need more. Every plan includes core POS, inventory, and sales tracking.
          </p>
        </div>

        {/* Interval toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'flex', gap: 4, padding: 3, borderRadius: 10,
            background: 'var(--paper)', border: '1px solid var(--line-soft)',
          }}>
            {(['monthly', 'yearly'] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setInterval(i)}
                style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none',
                  background: interval === i ? 'var(--card)' : 'transparent',
                  color: interval === i ? 'var(--ink)' : 'var(--ink-faint)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: interval === i ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {i === 'monthly' ? 'Monthly' : 'Annual'}
                {i === 'yearly' && (
                  <span style={{ color: 'var(--green)', fontSize: 10.5, fontWeight: 700, marginLeft: 6 }}>
                    Save ~20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 400, borderRadius: 16, background: 'var(--line-soft)' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {plans.map((plan) => {
              const price = interval === 'yearly' ? plan.billing.yearlyPriceMinor : plan.billing.monthlyPriceMinor;
              const isFree = price === 0;
              const registerUrl = `/register?plan=${plan.publicId}&interval=${interval}`;

              return (
                <div
                  key={plan.code}
                  style={{
                    background: 'var(--card)',
                    border: `1px solid ${plan.isRecommended ? 'var(--blue)' : 'var(--line-soft)'}`,
                    borderRadius: 16,
                    boxShadow: plan.isRecommended ? '0 0 0 1px var(--blue), 0 8px 24px -8px rgba(0,0,0,0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
                    padding: 28,
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {plan.isRecommended && (
                    <div style={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--blue)', color: '#fff', fontSize: 10.5, fontWeight: 700,
                      padding: '4px 16px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>
                      Most popular
                    </div>
                  )}

                  <div style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '.06em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 4 }}>
                    {plan.code}
                  </div>
                  <h3 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{plan.name}</h3>
                  {plan.shortDescription && (
                    <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '4px 0 12px', lineHeight: 1.4 }}>
                      {plan.shortDescription}
                    </p>
                  )}

                  <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink)', margin: '12px 0 4px' }}>
                    {isFree ? 'Free' : formatMinor(price)}
                  </div>
                  {!isFree && (
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 16 }}>
                      per {interval === 'monthly' ? 'month' : 'year'}
                      {interval === 'yearly' && (
                        <span style={{ display: 'block', marginTop: 2, color: 'var(--green)' }}>
                          {formatMinor(plan.billing.monthlyPriceMinor)}/mo billed annually
                        </span>
                      )}
                    </div>
                  )}

                  {plan.trial.enabled && !isFree && (
                    <div style={{
                      padding: '8px 12px', borderRadius: 8, background: 'var(--blue-soft)',
                      fontSize: 11.5, fontWeight: 600, color: 'var(--blue)', marginBottom: 14,
                    }}>
                      {plan.trial.durationDays}-day free trial — no card required
                    </div>
                  )}

                  <div style={{ flex: 1, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-faint)', marginBottom: 10 }}>
                      What's included
                    </div>
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                      const enabled = plan.features[key] === true;
                      return (
                        <div key={key} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 0', fontSize: 12.5,
                          color: enabled ? 'var(--ink)' : 'var(--ink-faint)',
                          opacity: enabled ? 1 : 0.5,
                        }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke={enabled ? 'var(--green)' : 'var(--ink-faint)'}
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          >
                            {enabled ? <polyline points="20 6 9 17 4 12" /> : <line x1="18" y1="6" x2="6" y2="18" />}
                          </svg>
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Limits summary */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px',
                    padding: '10px 12px', background: 'var(--paper)', borderRadius: 10,
                    border: '1px solid var(--line-soft)', marginBottom: 16, fontSize: 11.5,
                  }}>
                    {Object.entries(LIMIT_LABELS).map(([key, label]) => {
                      const val = plan.limits[key];
                      const display = val < 0 || val >= 999999999 ? 'Unlimited' : formatNumber(val);
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ color: 'var(--ink-faint)' }}>{label}</span>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{display}</span>
                        </div>
                      );
                    })}
                  </div>

                  {(
                    <Link to={registerUrl}
                      style={{
                        display: 'block', textAlign: 'center', padding: '12px', borderRadius: 11,
                        background: isFree ? 'var(--paper)' : plan.isRecommended ? 'var(--blue)' : 'var(--ink)',
                        color: isFree ? 'var(--ink)' : 'var(--card)',
                        fontSize: 13.5, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit',
                        border: isFree ? '1px solid var(--line)' : 'none',
                      }}
                    >
                      {isFree ? 'Start free' : `Start with ${plan.name}`}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Feature comparison table */}
        {plans.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', textAlign: 'center', marginBottom: 24 }}>
              Compare plans
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 14px', borderBottom: '2px solid var(--line)', color: 'var(--ink-faint)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>Feature</th>
                    {plans.map((p) => (
                      <th key={p.code} style={{ textAlign: 'center', padding: '10px 14px', borderBottom: '2px solid var(--line)', color: p.isRecommended ? 'var(--blue)' : 'var(--ink)', fontWeight: 700 }}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Limits */}
                  {Object.entries(LIMIT_LABELS).map(([key, label]) => (
                    <tr key={key}>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', color: 'var(--ink)' }}>{label}</td>
                      {plans.map((p) => {
                        const val = p.limits[key];
                        return (
                          <td key={p.code} style={{ textAlign: 'center', padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', fontWeight: 700 }}>
                            {val < 0 || val >= 999999999 ? 'Unlimited' : formatNumber(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Features */}
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                    <tr key={key}>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', color: 'var(--ink)' }}>{label}</td>
                      {plans.map((p) => (
                        <td key={p.code} style={{ textAlign: 'center', padding: '10px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                          {p.features[key] ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span style={{ color: 'var(--ink-faint)' }}>—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div style={{ marginTop: 60, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', textAlign: 'center', marginBottom: 28 }}>
            Frequently asked questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { q: 'Can I switch plans later?', a: 'Yes — upgrade immediately or schedule a downgrade for the next billing period. Usage limits are enforced automatically.' },
              { q: 'Is there a free trial?', a: 'Most paid plans include a free trial. No credit card required to start. Cancel anytime before the trial ends.' },
              { q: 'What happens if I exceed a limit?', a: 'We show clear usage warnings. If you hit a limit, you\'ll need to upgrade or reduce usage before creating more.' },
              { q: 'Can I cancel anytime?', a: 'Yes. You keep access through the end of your billing period. No cancellation fees.' },
              { q: 'What payment methods do you accept?', a: 'All major credit and debit cards. Enterprise customers can request invoice billing.' },
            ].map((faq) => (
              <div key={faq.q} style={{
                padding: '16px 18px', background: 'var(--card)', borderRadius: 12,
                border: '1px solid var(--line-soft)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{faq.q}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--line-soft)', padding: '24px',
        textAlign: 'center', fontSize: 12.5, color: 'var(--ink-faint)',
      }}>
        &copy; {new Date().getFullYear()} StoreFlow. All prices in USD.
      </footer>
    </div>
  );
}
