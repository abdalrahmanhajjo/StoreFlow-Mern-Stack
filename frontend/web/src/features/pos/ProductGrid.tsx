import { useState, useMemo, type KeyboardEvent } from 'react';
import { useProducts, CATEGORIES, statusFor, type Product } from '@/features/products/productsStore';
import { useCart } from './cartStore';
import { money } from '@/lib/format';
import { toast } from '@/components/ui';

const EMOJI: Record<string, string> = {
  All: '🛍️', Beverages: '🥤', Bakery: '🥐', Dairy: '🥛', Produce: '🥦', Household: '🧹', Pantry: '🏪',
};

const STOCK: Record<string, { label: string; color: string; bg: string }> = {
  'In stock': { label: 'In stock', color: 'var(--green)', bg: 'var(--green-soft)' },
  'Low stock': { label: 'Low stock', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  'Out of stock': { label: 'Out of stock', color: 'var(--red)', bg: 'var(--red-soft)' },
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
      <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, padding: '11px 14px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKey} placeholder="Enter name, SKU, handle or supplier code" aria-label="Search" style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--ink)', background: 'transparent' }} />
        </div>
        <button
          type="button"
          onClick={() => { if (filtered.length) { tryAdd(filtered[0]); setQuery(''); } }}
          className="eyebrow"
          style={{ border: 'none', borderLeft: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', fontSize: 12, padding: '0 22px', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .12s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--paper-dim)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--card)')}
        >Search</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCat(c)} style={{ padding: '6px 13px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: cat === c ? '1px solid var(--ink)' : '1px solid var(--line)', cursor: 'pointer', background: cat === c ? 'var(--ink)' : 'var(--card)', color: cat === c ? 'var(--card)' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 5, transition: 'all .12s' }}>
            <span style={{ fontSize: 13 }}>{EMOJI[c] ?? '📦'}</span>{c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.25 }}>🔍</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>No products match</div>
          <button onClick={() => { setQuery(''); setCat('All'); }} style={{ marginTop: 12, padding: '7px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', fontSize: 12, cursor: 'pointer', color: 'var(--ink-soft)' }}>Clear</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
          {filtered.map((p) => {
            const s = STOCK[statusFor(p)];
            const out = statusFor(p) === 'Out of stock';
            const hero = p.image?.replace('w=160&h=160', 'w=480&h=480');
            return (
              <button key={p.id} onClick={() => tryAdd(p)} disabled={out} className="sf-pos-tile" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, padding: 0, overflow: 'hidden', textAlign: 'left', cursor: out ? 'not-allowed' : 'pointer', opacity: out ? 0.45 : 1, transition: 'border-color .15s, transform .15s', outline: 'none', display: 'flex', flexDirection: 'column' }}
                onMouseEnter={(e) => { if (!out) { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ position: 'relative', background: 'var(--paper-dim)', aspectRatio: '1 / 1', overflow: 'hidden' }}>
                  <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>{p.emoji}</div>
                  {hero && (
                    <img src={hero} alt={p.name} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .35s ease' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  )}
                  <span className="eyebrow" style={{ position: 'absolute', top: 8, left: 8, fontSize: 8.5, padding: '3px 8px', borderRadius: 4, background: 'var(--overlay-chip)', color: s.color, backdropFilter: 'blur(2px)' }}>{s.label}</span>
                  {out && <div className="eyebrow" style={{ position: 'absolute', inset: 0, background: 'var(--overlay-fade)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--red)' }}>Sold out</div>}
                </div>
                <div style={{ padding: '10px 12px 11px', borderTop: '1px solid var(--line-soft)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 2 }}>{p.sku}</div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14, flexShrink: 0 }}>{money(p.price)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
