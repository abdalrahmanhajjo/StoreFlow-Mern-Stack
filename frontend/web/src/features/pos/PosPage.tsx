import { useState, useEffect } from 'react';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { useCart, useCartTotals } from './cartStore';
import { useSession } from '@/store/session';
import { money } from '@/lib/format';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useStoreConfig } from '@/config/StoreProfileContext';
import { isConnected, apiGetStoreSettings } from '@/lib/api/resources';

export default function PosPage() {
  const cashier = useSession((s) => s.user?.name ?? 'Cashier');
  const items = useCart((s) => s.items);
  const t = useCartTotals();
  const [time, setTime] = useState(new Date());
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [cartOpen, setCartOpen] = useState(false);

  // This store's own tax rate drives every total on the register. Connected
  // mode reads store-settings — the SAME authoritative source the server uses
  // to compute the sale — so what the register shows always equals what the
  // server charges. Demo mode falls back to the business-type template.
  const templateTaxRate = useStoreConfig().effective.tax.defaultRate;
  useEffect(() => {
    if (!isConnected) {
      useCart.getState().setTaxRate(templateTaxRate);
      return;
    }
    let alive = true;
    apiGetStoreSettings()
      .then((s) => { if (alive) useCart.getState().setTaxRate((s.taxRate ?? 0) / 100); })
      .catch(() => { if (alive) useCart.getState().setTaxRate(templateTaxRate); });
    return () => { alive = false; };
  }, [templateTaxRate]);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--paper)', margin: '-24px -28px', position: 'relative' }}>
        {/* Header */}
        <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--line)', padding: '0 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, height: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 2px rgba(46,125,67,0.18)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>POS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {itemCount > 0 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', background: 'var(--paper-dim)', padding: '2px 10px', borderRadius: 6 }}>
                {itemCount}
              </div>
            )}
            <div style={{ textAlign: 'right', fontSize: 11, lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>{cashier}</div>
              <div className="mono" style={{ color: 'var(--ink-faint)' }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </header>

        {/* Product grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
          <ProductGrid />
        </div>

        {/* Cart bar (floating) */}
        {itemCount > 0 && (
          <>
            <button type="button" onClick={() => setCartOpen(true)} style={{ position: 'sticky', bottom: 0, left: 0, right: 0, margin: '10px 10px 14px', padding: '14px 16px', borderRadius: 12, border: 'none', background: 'var(--ink)', color: 'var(--card)', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
              <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
              <span className="mono" style={{ fontSize: 17, fontWeight: 800 }}>{money(t.total)}</span>
            </button>

            {/* Full-screen cart overlay */}
            {cartOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--card)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <strong style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>Cart</strong>
                  <button type="button" onClick={() => setCartOpen(false)} style={{ border: 'none', background: 'var(--paper)', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                  <Cart />
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state CTA */}
        {itemCount === 0 && (
          <div style={{ textAlign: 'center', padding: '14px 14px 24px', color: 'var(--ink-faint)', fontSize: 12, background: 'var(--card)' }}>
            Tap items above to start a sale
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 104px)', overflow: 'hidden' }}>
      <header style={{ padding: '18px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexShrink: 0, gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ fontSize: 10, color: 'var(--ink-faint)', marginBottom: 2 }}>Register · Counter 1</div>
          <h1 className="display" style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--ink)', lineHeight: 1.05 }}>Point of Sale</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 3 }}>
          {itemCount > 0 && (
            <div className="eyebrow" style={{ fontSize: 11, color: 'var(--ink)' }}>
              <span className="mono" style={{ fontWeight: 700 }}>{itemCount}</span> item{itemCount > 1 ? 's' : ''}
            </div>
          )}
          <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, color: 'var(--ink-soft)' }}>{cashier}</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 18, flex: 1, overflow: 'hidden', padding: '0 24px 18px' }}>
        <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <ProductGrid />
          </div>
        </div>
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}>
          <Cart />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 24px', borderTop: '1px solid var(--line)', fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />Online</span>
        <span>{new Date().toLocaleDateString()} · Register RF-01</span>
      </div>
    </div>
  );
}
