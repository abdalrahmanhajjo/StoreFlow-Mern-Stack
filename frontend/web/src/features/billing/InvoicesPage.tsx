import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, toast } from '@/components/ui';
import { billingService, type InvoiceInfo } from './billingService';
import { money } from '@/lib/format';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  paid: { label: 'Paid', color: 'var(--green)' },
  open: { label: 'Open', color: 'var(--blue)' },
  draft: { label: 'Draft', color: 'var(--ink-faint)' },
  uncollectible: { label: 'Uncollectible', color: 'var(--red)' },
  void: { label: 'Void', color: 'var(--ink-faint)' },
};

function formatMinor(amount: number): string {
  return money(amount / 100);
}

export default function InvoicesPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingService.getInvoices()
      .then(setInvoices)
      .catch(() => toast.error('Could not load invoices'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: isMobile ? 16 : 20 }}>
        <div style={{ height: 22, width: 200, background: 'var(--line-soft)', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ height: 300, background: 'var(--card)', borderRadius: 16, border: '1px solid var(--line-soft)' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? 16 : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 20, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Billing</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Invoices</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>
            Payment history and receipts
          </p>
        </div>
        <Link to="/settings/billing" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>
            ← Billing
          </Button>
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          padding: isMobile ? 40 : 60, textAlign: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0 }}>No invoices yet.</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16,
          overflow: 'hidden',
        }}>
          {invoices.map((inv, i) => {
            const st = STATUS_LABEL[inv.status] ?? { label: inv.status, color: 'var(--ink-faint)' };
            return (
              <div key={inv.publicId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: isMobile ? '14px 16px' : '16px 24px',
                borderBottom: i < invoices.length - 1 ? '1px solid var(--line-soft)' : 'none',
                gap: 12, flexWrap: isMobile ? 'wrap' : undefined,
              }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {inv.number ?? `INV-${inv.publicId.slice(0, 8)}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {new Date(inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {inv.periodStart ? `${new Date(inv.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(inv.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '—'}
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                  {formatMinor(inv.totalMinor)}
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginLeft: 2 }}>{inv.currency}</span>
                </div>

                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: `${st.color}15`, color: st.color, whiteSpace: 'nowrap',
                }}>
                  {st.label}
                </span>

                <div style={{ display: 'flex', gap: 6 }}>
                  {inv.hostedInvoiceUrl && (
                    <a href={inv.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <Button variant="ghost" size="sm">View</Button>
                    </a>
                  )}
                  {inv.receiptUrl && (
                    <a href={inv.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <Button size="sm">Receipt</Button>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
