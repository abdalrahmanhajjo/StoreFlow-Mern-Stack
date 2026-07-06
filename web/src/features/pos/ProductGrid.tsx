import { useState, useMemo, type KeyboardEvent } from 'react';
import { useProducts, CATEGORIES, statusFor, type Product } from '@/features/products/productsStore';
import { useCart } from './cartStore';
import { money } from '@/lib/format';
import { toast, ProductThumb } from '@/components/ui';

const EMOJI: Record<string, string> = {
  All: '🛍️', Beverages: '🥤', Bakery: '🥐', Dairy: '🥛', Produce: '🥦', Household: '🧹', Pantry: '🏪',
};

const STOCK: Record<string, { label: string; color: string; bg: string }> = {
  'In stock': { label: 'In stock', color: '#16a34a', bg: '#dcfce7' },
  'Low stock': { label: 'Low stock', color: '#d97706', bg: '#fef3c7' },
  'Out of stock': { label: 'Out of stock', color: '#dc2626', bg: '#fee2e2' },
};

export function ProductGrid() {
  const products = useProducts((s) => s.products);
  const add = useCart((s) => s.add);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (cat === 'All' || p.category === cat) && (!q || p.name.toLowerCase().includes(q) || p.sku.includes(q)));
  }, [products, query, cat]);

  const tryAdd = (p: Product) => {
    if (statusFor(p) === 'Out of stock') { toast(`${p.name} is out of stock`); return; }
    add(p);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length) { e.preventDefault(); tryAdd(filtered[0]); setQuery(''); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} placeholder="Search or scan barcode…" aria-label="Search" style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--ink)', background: 'transparent' }} />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--line)', cursor: 'pointer', background: cat === c ? '#0f172a' : '#fff', color: cat === c ? '#fff' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all .12s' }}>
            <span style={{ fontSize: 13 }}>{EMOJI[c] ?? '📦'}</span>{c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.25 }}>🔍</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No products match</div>
          <button onClick={() => { setQuery(''); setCat('All'); }} style={{ marginTop: 12, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', fontSize: 12, cursor: 'pointer', color: 'var(--ink-soft)' }}>Clear</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 8 }}>
          {filtered.map((p) => {
            const s = STOCK[statusFor(p)];
            const out = statusFor(p) === 'Out of stock';
            return (
              <button key={p.id} onClick={() => tryAdd(p)} disabled={out} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: 0, overflow: 'hidden', textAlign: 'left', boxShadow: '0 1px 3px rgba(0,0,0,.04)', cursor: out ? 'not-allowed' : 'pointer', opacity: out ? 0.4 : 1, transition: 'box-shadow .12s,transform .12s', outline: 'none' }}
                onMouseEnter={(e) => { if (!out) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ position: 'relative', background: 'var(--paper)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 8px 8px' }}>
                    <ProductThumb src={p.image} emoji={p.emoji} alt={p.name} size={64} radius={8} />
                  </div>
                  {out && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#dc2626' }}>Sold out</div>}
                </div>
                <div style={{ padding: '9px 10px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 2, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                  <div className="mono" style={{ fontWeight: 800, color: 'var(--ink)', fontSize: 15, marginBottom: 6 }}>{money(p.price)}</div>
                  <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
