import { useRef, useState, useEffect } from 'react';

interface Props {
  categories: string[];
  selected: string;
  counts: Record<string, number>;
  onChange: (cat: string) => void;
}

export function CategoryPills({ categories, selected, counts, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [categories]);

  return (
    <div style={{ position: 'relative' }}>
      {canScrollLeft && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to right, var(--card), transparent)', pointerEvents: 'none', zIndex: 1 }} />
      )}
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Filter by category"
        style={{
          display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none',
          msOverflowStyle: 'none', padding: '2px 0',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`.sf-pills::-webkit-scrollbar { display: none; }`}</style>
        {categories.map((cat) => {
          const isActive = selected === cat;
          const count = counts[cat] ?? 0;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(cat)}
              className="sf-pills"
              style={{
                padding: '8px 16px', borderRadius: 10, fontSize: 12.5,
                fontWeight: 600, border: '1px solid',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'background .15s, color .15s, border-color .15s',
                background: isActive ? 'var(--blue)' : 'var(--card)',
                color: isActive ? '#fff' : 'var(--ink-soft)',
                borderColor: isActive ? 'var(--blue)' : 'var(--line)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {cat}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, borderRadius: 9,
                fontSize: 10, fontWeight: 700,
                background: isActive ? 'rgba(255,255,255,.25)' : 'var(--paper-dim)',
                color: isActive ? '#fff' : 'var(--ink-faint)',
                padding: '0 5px',
              }}>{count}</span>
            </button>
          );
        })}
      </div>
      {canScrollRight && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 24, background: 'linear-gradient(to left, var(--card), transparent)', pointerEvents: 'none', zIndex: 1 }} />
      )}
    </div>
  );
}
