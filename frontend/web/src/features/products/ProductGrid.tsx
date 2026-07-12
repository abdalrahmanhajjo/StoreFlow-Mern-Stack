import { useMemo } from 'react';
import { useProducts, statusFor, type Product } from '../products/productsStore';
import { Badge, confirm } from '@/components/ui';
import { money } from '@/lib/format';

interface Props {
  query: string;
  category: string;
  stockFilter: string;
  onEdit: (product: Product) => void;
  writable: boolean;
}

export function ProductGrid({ query, category, stockFilter, onEdit, writable }: Props) {
  const { products, remove } = useProducts();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((p) => {
      const st = statusFor(p);
      const matchQ = !term || p.name.toLowerCase().includes(term) || p.sku.includes(term) || p.barcode.includes(term);
      const matchCat = category === 'All' || p.category === category;
      const matchStock =
        stockFilter === 'any' ||
        (stockFilter === 'in' && st === 'In stock') ||
        (stockFilter === 'low' && st === 'Low stock') ||
        (stockFilter === 'out' && st === 'Out of stock');
      return matchQ && matchCat && matchStock;
    });
  }, [products, query, category, stockFilter]);

  const handleDelete = async (p: Product) => {
    if (await confirm({ title: `Delete “${p.name}”?`, message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })) {
      remove(p.id);
    }
  };

  if (filtered.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '64px 24px', textAlign: 'center',
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No products found</p>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>
          {query || category !== 'All' || stockFilter !== 'any'
            ? 'Try adjusting your search or filters.'
            : 'Add your first product to get started.'}
        </p>
      </div>
    );
  }

  const stockBadge = (p: Product) => {
    const s = statusFor(p);
    return <Badge tone={s === 'In stock' ? 'green' : s === 'Low stock' ? 'amber' : 'red'}>{s}</Badge>;
  };

  return (
    <>
      <style>{`
        .sf-prod-card {
          transition: border-color .2s, transform .2s;
        }
        .sf-prod-card:hover {
          border-color: var(--ink);
          transform: translateY(-2px);
        }
        .sf-prod-card:hover .sf-prod-img { transform: scale(1.04); }
        .sf-prod-card-actions {
          opacity: 0; transition: opacity .15s;
        }
        .sf-prod-card:hover .sf-prod-card-actions,
        .sf-prod-card:focus-within .sf-prod-card-actions { opacity: 1; }
        @media (hover: none) {
          .sf-prod-card-actions { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-prod-card, .sf-prod-card-actions { transition: none; }
          .sf-prod-card:hover { transform: none; }
        }
      `}</style>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {filtered.map((p) => (
          <div
            key={p.id}
            className="sf-prod-card"
            style={{
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 8, overflow: 'hidden',
            }}
          >
            <div style={{ position: 'relative', background: 'var(--paper-dim)', aspectRatio: '4 / 3', overflow: 'hidden' }}>
              <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>{p.emoji}</div>
              {p.image && (
                <img
                  className="sf-prod-img"
                  src={p.image.replace('w=160&h=160', 'w=480&h=360')}
                  alt={p.name}
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .35s ease' }}
                />
              )}
              <span style={{ position: 'absolute', top: 10, left: 10 }}>{stockBadge(p)}</span>
            </div>

            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line-soft)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <span className="mono">{p.sku}</span>
                {p.barcode && <span className="mono"> · {p.barcode}</span>}
                {p.category && <> · {p.category}</>}
              </div>
              <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginTop: 8 }}>{money(p.price)}</div>
            </div>

            <div className="sf-prod-card-actions" style={{
              display: 'flex', gap: 2, borderTop: '1px solid var(--line-soft)',
              background: 'var(--paper)', padding: '6px 8px',
            }}>
              <button
                type="button"
                onClick={() => onEdit(p)}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11.5, fontWeight: 600,
                  color: 'var(--ink-soft)', background: 'transparent',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                </svg>
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(p)}
                disabled={!writable}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 11.5, fontWeight: 600,
                  color: writable ? 'var(--red)' : 'var(--ink-faint)',
                  background: 'transparent', border: 'none', borderRadius: 6, cursor: writable ? 'pointer' : 'not-allowed',
                  opacity: writable ? 1 : 0.5,
                }}
                onMouseEnter={(e) => { if (writable) e.currentTarget.style.background = 'var(--red-soft)'; }}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
