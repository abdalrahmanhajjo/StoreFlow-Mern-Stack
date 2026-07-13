import { useState, useMemo, useRef } from 'react';
import { useProducts } from '@/features/products/productsStore';
import { useInventory, type AdjustReason } from './inventoryStore';
import { useSession } from '@/store/session';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal, Button, Input, Badge, toast, confirm } from '@/components/ui';

const REASONS: AdjustReason[] = ['Restock', 'Damage', 'Recount', 'Expired'];

const REASON_META: Record<AdjustReason, { icon: string; tone: 'green' | 'red' | 'amber' | 'grey' }> = {
  Restock: { icon: '📦', tone: 'green' },
  Damage: { icon: '⚠️', tone: 'red' },
  Recount: { icon: '📋', tone: 'amber' },
  Expired: { icon: '⏳', tone: 'grey' },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function InventoryPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const by = useSession((s) => s.user?.name ?? 'Staff');
  const products = useProducts((s) => s.products);
  const { adjustments, adjust } = useInventory();
  const selectedRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<AdjustReason>('Restock');
  const [note, setNote] = useState('');
  const [histQuery, setHistQuery] = useState('');
  const [histReason, setHistReason] = useState<AdjustReason | 'all'>('all');

  const lowStock = useMemo(() =>
    products.filter((p) => p.stock <= p.reorderPoint),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.includes(q) || p.barcode.includes(q)
    );
  }, [products, productQuery]);

  const selectedProduct = productId ? products.find((p) => p.id === productId) : null;

  const filteredHistory = useMemo(() => {
    const q = histQuery.trim().toLowerCase();
    return adjustments.filter((a) => {
      const matchQ = !q || a.productName.toLowerCase().includes(q);
      const matchR = histReason === 'all' || a.reason === histReason;
      return matchQ && matchR;
    });
  }, [adjustments, histQuery, histReason]);

  const outCount = useMemo(() => lowStock.filter((p) => p.stock <= 0).length, [lowStock]);
  const warnCount = useMemo(() => lowStock.filter((p) => p.stock > 0 && p.stock <= p.reorderPoint).length, [lowStock]);

  const openModal = (prefill?: { id: string }) => {
    if (prefill) {
      setProductId(prefill.id);
      const p = products.find((x) => x.id === prefill.id);
      setProductQuery(p ? p.name : '');
    } else {
      setProductId('');
      setProductQuery('');
    }
    setDelta(0);
    setReason('Restock');
    setNote('');
    setModalOpen(true);
    setTimeout(() => selectedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const submit = () => {
    if (!productId) return toast('Select a product');
    if (delta === 0) return toast('Enter a non‑zero change');
    const p = products.find((x) => x.id === productId);
    if (!p) return toast('Product not found');
    if (p.stock + delta < 0) return toast(`Adjustment would make stock negative (${p.stock} + ${delta} = ${p.stock + delta})`);
    const res = adjust(productId, delta, reason, note, by);
    if (!res.ok) return toast(res.error ?? 'Could not adjust');
    toast(`${p.name}: stock ${p.stock} → ${p.stock + delta}`);
    setModalOpen(false);
  };

  const selectProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) setProductQuery(p.name);
  };

  const clearHistory = async () => {
    if (adjustments.length === 0) return;
    if (await confirm({ title: 'Clear adjustment history?', message: 'This clears the history shown here. Stock levels are unchanged.', confirmLabel: 'Clear', danger: true })) {
      useInventory.getState().clear();
      toast('History view cleared');
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .sf-inv-mobile-full { width: 100% !important; }
        }
        .sf-inv-card { transition: box-shadow .2s, transform .2s; }
        .sf-inv-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .sf-inv-card { transition: none; }
          .sf-inv-card:hover { transform: none; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end',
        marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row',
      }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 4 }}>Catalog</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Inventory &amp; stock</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{products.length} products · {lowStock.length} below threshold</p>
        </div>
        <Button onClick={() => openModal()} style={{ width: isMobile ? '100%' : undefined }}>+ Adjust stock</Button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 14 : 18 }}>
        {[
          { label: 'Total', value: products.length, color: 'var(--ink)' },
          { label: 'In stock', value: products.length - lowStock.length, color: 'var(--green)' },
          { label: 'Low stock', value: warnCount, color: 'var(--amber)' },
          { label: 'Out of stock', value: outCount, color: 'var(--red)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 12px' : '14px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Low-stock card */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', marginBottom: isMobile ? 14 : 18 }}>
        <div style={{ padding: isMobile ? '12px 14px' : '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)', fontWeight: 700 }}>Low-stock alerts</h3>
          <span style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)' }}>{lowStock.length} product{lowStock.length !== 1 ? 's' : ''} at or below reorder point</span>
        </div>

        {lowStock.length === 0 ? (
          <div style={{ padding: isMobile ? '36px 16px' : '48px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 10 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>All stocked up</p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>Every product is above its reorder threshold.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? 8 : 12, padding: isMobile ? 10 : 16 }}>
            {lowStock.map((p) => {
              const st = p.stock <= 0 ? 'Out of stock' : 'Low stock';
              const tone = st === 'Out of stock' ? 'red' : 'amber';
              const pct = Math.min(100, Math.round((p.stock / p.reorderPoint) * 100));
              const suggested = Math.max(p.reorderPoint * 2 - p.stock, p.reorderPoint);
              return (
                <div key={p.id} className="sf-inv-card" style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? 12 : 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: isMobile ? 22 : 24 }}>{p.emoji}</span>
                      <div>
                        <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 1 }}>{p.name}</div>
                        <div style={{ fontSize: isMobile ? 10.5 : 11, color: 'var(--ink-faint)', fontFamily: 'monospace' }}>{p.sku}</div>
                      </div>
                    </div>
                    <Badge tone={tone}>{st}</Badge>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: isMobile ? 10.5 : 11, color: 'var(--ink-soft)' }}>Stock</span>
                    <span className="mono" style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: st === 'Out of stock' ? 'var(--red)' : 'var(--amber)' }}>{p.stock} <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>/ {p.reorderPoint}</span></span>
                  </div>

                  <div style={{ height: 6, background: 'var(--line-soft)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: st === 'Out of stock' ? 'var(--red)' : 'var(--amber)', transition: 'width .3s' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: isMobile ? 10.5 : 11, color: 'var(--green)', fontWeight: 600 }}>Order +{suggested}</span>
                    <Button variant="ghost" size="sm" onClick={() => openModal({ id: p.id })}>Quick adjust</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adjustment history */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: isMobile ? '12px 14px' : '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 10 : 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)', fontWeight: 700 }}>Adjustment history</h3>
              <span style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)' }}>{adjustments.length} log{adjustments.length !== 1 ? 's' : ''}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearHistory} disabled={adjustments.length === 0}>Clear</Button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            <input value={histQuery} onChange={(e) => setHistQuery(e.target.value)} placeholder="Search product…" style={{ flex: 1, padding: isMobile ? '10px 12px' : '7px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: isMobile ? 14 : 12.5, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--paper)' }} />
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              {(['all', ...REASONS] as const).map((r) => (
                <button key={r} type="button" onClick={() => setHistReason(r)} style={{ flex: isMobile ? 1 : undefined, padding: isMobile ? '8px 0' : '4px 10px', borderRadius: 6, fontSize: isMobile ? 12 : 11, fontWeight: 600, border: '1px solid var(--line)', cursor: 'pointer', background: histReason === r ? 'var(--ink)' : 'var(--card)', color: histReason === r ? 'var(--card)' : 'var(--ink-soft)' }}>
                  {r === 'all' ? 'All' : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ padding: isMobile ? '36px 16px' : '48px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 10 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              {adjustments.length === 0 ? 'No adjustments yet' : 'No matches'}
            </p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>
              {adjustments.length === 0 ? 'Use the "Adjust stock" button to log changes.' : 'Try a different search or filter.'}
            </p>
          </div>
        ) : isMobile ? (
          /* Mobile: card layout */
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredHistory.map((a) => {
              const meta = REASON_META[a.reason];
              return (
                <div key={a.id} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', flex: 1 }}>{a.productName}</div>
                    <span className="mono" style={{ fontWeight: 800, fontSize: 15, color: a.delta > 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0, marginLeft: 8 }}>{a.delta > 0 ? '+' : ''}{a.delta}</span>
                  </div>
                  {a.note && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8 }}>{a.note}</div>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5, color: 'var(--ink-soft)' }}>
                    <Badge tone={meta.tone}>{meta.icon} {a.reason}</Badge>
                    <span>{a.by}</span>
                    <span className="mono" style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }}>{timeAgo(a.at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop: table layout */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 100px', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span>Product</span><span style={{ textAlign: 'right' }}>Change</span><span>Reason</span><span>By</span><span style={{ textAlign: 'right' }}>When</span>
            </div>
            {filteredHistory.map((a) => {
              const meta = REASON_META[a.reason];
              return (
                <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 80px 100px', gap: 8, alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.productName}
                    {a.note && <span style={{ fontWeight: 400, color: 'var(--ink-faint)', fontSize: 11.5, marginLeft: 6 }}>— {a.note}</span>}
                  </div>
                  <span className="mono" style={{ textAlign: 'right', fontWeight: 800, color: a.delta > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {a.delta > 0 ? '+' : ''}{a.delta}
                  </span>
                  <span><Badge tone={meta.tone}>{meta.icon} {a.reason}</Badge></span>
                  <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{a.by}</span>
                  <span className="mono" style={{ textAlign: 'right', color: 'var(--ink-faint)', fontSize: 12 }}>{timeAgo(a.at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adjust stock">
        <div ref={selectedRef}>
          <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Product</label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input value={productQuery} onChange={(e) => { setProductQuery(e.target.value); if (e.target.value !== productQuery) setProductId(''); }} placeholder="Search name, SKU or barcode…" style={{ width: '100%', padding: '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--card)' }} />
            {productQuery && !productId && filteredProducts.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11, boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 20, maxHeight: 220, overflow: 'auto' }}>
                {filteredProducts.slice(0, 10).map((p) => (
                  <div key={p.id} onClick={() => selectProduct(p.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') selectProduct(p.id); }}
                    style={{ padding: '10px 13px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{p.emoji}</span>
                    <span style={{ flex: 1 }}>{p.name} <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>{p.sku}</span></span>
                    <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 12 }}>on hand: {p.stock}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div style={{ background: 'var(--paper)', borderRadius: 10, border: '1px solid var(--line-soft)', padding: isMobile ? '10px 12px' : '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: isMobile ? 22 : 24 }}>{selectedProduct.emoji}</span>
                <div>
                  <div style={{ fontSize: isMobile ? 13 : 13.5, fontWeight: 700, color: 'var(--ink)' }}>{selectedProduct.name}</div>
                  <div className="mono" style={{ fontSize: isMobile ? 10.5 : 11, color: 'var(--ink-faint)' }}>{selectedProduct.sku}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Current</div>
                <div className="mono" style={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: selectedProduct.stock <= selectedProduct.reorderPoint ? 'var(--amber)' : 'var(--green)' }}>{selectedProduct.stock}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Change (+/-)</label>
              <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} placeholder="0" style={{ width: '100%', padding: '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--card)', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[10, 25, 50, 100].map((n) => (
                  <button key={n} type="button" onClick={() => setDelta(n)} style={{ flex: isMobile ? 1 : undefined, padding: isMobile ? '8px 0' : '3px 10px', borderRadius: 5, border: '1px solid var(--line)', fontSize: isMobile ? 13 : 11, fontWeight: 600, cursor: 'pointer', background: delta === n ? 'var(--blue-soft)' : 'var(--card)', color: delta === n ? 'var(--blue-deep)' : 'var(--ink-soft)' }}>+{n}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Reason</label>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr', gap: 4 }}>
                {REASONS.map((r) => (
                  <button key={r} type="button" onClick={() => setReason(r)} style={{ padding: isMobile ? '10px 0' : '10px 0', borderRadius: 9, border: `1px solid ${reason === r ? 'var(--blue)' : 'var(--line)'}`, fontSize: isMobile ? 12 : 12, fontWeight: 600, cursor: 'pointer', background: reason === r ? 'var(--blue-soft)' : 'var(--card)', color: reason === r ? 'var(--blue-deep)' : 'var(--ink-soft)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: isMobile ? 18 : 16 }}>{REASON_META[r].icon}</span>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: isMobile ? 14 : 16 }}>
            <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Damaged during shipment" />
          </div>

          {selectedProduct && delta !== 0 && (
            <div style={{ marginTop: isMobile ? 12 : 14, padding: '10px 14px', borderRadius: 9, background: 'var(--paper)', border: '1px solid var(--line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Result</span>
              <span className="mono" style={{ fontSize: isMobile ? 15 : 16, fontWeight: 800, color: selectedProduct.stock + delta <= selectedProduct.reorderPoint ? 'var(--amber)' : 'var(--green)' }}>
                {selectedProduct.stock} → {Math.max(0, selectedProduct.stock + delta)}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: isMobile ? 16 : 18 }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!productId || delta === 0}>Apply adjustment</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
