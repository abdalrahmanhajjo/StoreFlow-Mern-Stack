import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { ProductSummary } from '@/lib/contracts/types';
import { useFormatters } from '@/config/StoreProfileContext';

export interface ProductSearchProps {
  products: ProductSummary[];
  onSelect: (product: ProductSummary) => void;
  label?: string;
  placeholder?: string;
  /** Max results rendered (perf). */
  limit?: number;
}

function matches(p: ProductSummary, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    p.name.toLowerCase().includes(needle) ||
    p.sku.toLowerCase().includes(needle) ||
    (p.barcode?.toLowerCase().includes(needle) ?? false)
  );
}

// Accessible product finder for POS (ARIA 1.2 combobox). Filters by name, SKU or
// barcode; an exact barcode/SKU match + Enter selects immediately (scanner-friendly).
export function ProductSearch({ products, onSelect, label = 'Find a product', placeholder = 'Search name, SKU or scan barcode', limit = 8 }: ProductSearchProps) {
  const fmt = useFormatters();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const optId = (i: number) => `${listId}-opt-${i}`;

  const results = useMemo(() => {
    const q = query.trim();
    if (q === '') return [];
    return products.filter((p) => matches(p, q)).slice(0, limit);
  }, [products, query, limit]);

  const exact = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.find((p) => p.barcode?.toLowerCase() === q || p.sku.toLowerCase() === q);
  }, [products, query]);

  const choose = (p: ProductSummary | undefined) => {
    if (!p) return;
    onSelect(p);
    setQuery('');
    setOpen(false);
    setActive(0);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(exact ?? results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <label htmlFor={listId + '-input'} style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBlockEnd: 7 }}>
        {label}
      </label>
      <input
        id={listId + '-input'}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results.length > 0 ? optId(active) : undefined}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', background: 'var(--card)' }}
      />
      {open && query.trim() !== '' && (
        <div
          id={listId}
          role="listbox"
          aria-label="Product results"
          style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 'calc(100% + 4px)', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 20, maxHeight: 300, overflow: 'auto' }}
        >
          {results.length === 0 ? (
            <div role="option" aria-selected={false} aria-disabled style={{ padding: '12px', fontSize: 13, color: 'var(--ink-faint)' }}>
              No products match “{query.trim()}”.
            </div>
          ) : (
            results.map((p, i) => (
              <div
                key={p.id}
                id={optId(i)}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: i === active ? 'var(--paper)' : undefined }}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--ink)' }}>
                  {p.name}
                  <small style={{ color: 'var(--ink-faint)', marginInlineStart: 8 }} className="mono">{p.sku}</small>
                  {p.prescriptionRequired && <span style={{ marginInlineStart: 8, fontSize: 11, color: 'var(--amber)' }}>Rx</span>}
                  {p.ageRestricted && <span style={{ marginInlineStart: 8, fontSize: 11, color: 'var(--red)' }}>18+</span>}
                </span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ink-soft)' }}>{fmt.money(p.price)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
