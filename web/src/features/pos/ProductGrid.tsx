import { useState, useMemo, type KeyboardEvent } from 'react';
import { useProducts, CATEGORIES, type Product } from '@/features/products/productsStore';
import { useCart } from './cartStore';
import { money } from '@/lib/format';
import { toast, ProductThumb } from '@/components/ui';

export function ProductGrid() {
  const products = useProducts((s) => s.products);
  const add = useCart((s) => s.add);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('All');

  // SF-501: live filter by name/SKU + category
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = cat === 'All' || p.category === cat;
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.sku.includes(q);
      return matchCat && matchQ;
    });
  }, [products, query, cat]);

  const tryAdd = (p: Product) => {
    if (p.stock <= 0) {
      toast(`${p.name} is out of stock`);
      return;
    }
    add(p);
    toast(`${p.name} added to sale`);
  };

  // SF-501: Enter = barcode behavior (add first visible match)
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length) {
      e.preventDefault();
      tryAdd(filtered[0]);
      setQuery('');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1px solid var(--line)', borderRadius: 11, padding: '10px 13px', marginBottom: 14 }}>
        <span aria-hidden style={{ color: 'var(--ink-faint)' }}>🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search products by name or scan a barcode…"
          aria-label="Search products"
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13.5, fontFamily: 'inherit', color: 'var(--ink)', background: 'transparent' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => setCat(c)}
            style={{ padding: '8px 15px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, border: '1px solid var(--line)', cursor: 'pointer', background: cat === c ? 'var(--blue)' : '#fff', color: cat === c ? '#fff' : 'var(--ink-soft)' }}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-faint)' }}>No products match “{query}”.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
          {filtered.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => tryAdd(p)}
              style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 14, textAlign: 'left', boxShadow: 'var(--shadow)', cursor: 'pointer', opacity: p.stock <= 0 ? 0.55 : 1 }}
            >
              <div style={{ marginBottom: 10 }}><ProductThumb src={p.image} emoji={p.emoji} alt={p.name} size={64} radius={9} /></div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>SKU {p.sku} · {p.stock} left</div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14, marginTop: 8 }}>{money(p.price)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
