import { useId, useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { COUNTRY_CODES } from '@/features/auth/schemas';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  ariaLabel?: string;
  error?: string;
}

export function PhoneCodeSelect({ value, onChange, onBlur, ariaLabel = 'Country code', error }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optId = (i: number) => `${listId}-opt-${i}`;

  const selected = COUNTRY_CODES.find((c) => c.code === value);

  const filtered = query
    ? COUNTRY_CODES.filter(
        (c) =>
          c.code.includes(query) ||
          c.label.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRY_CODES;

  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open, onBlur]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) choose(filtered[active].code); }
    else if (e.key === 'Escape') { setOpen(false); onBlur?.(); }
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: 130, flexShrink: 0 }}>
      <div
        onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 10); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '12px 13px', borderRadius: 11,
          border: `1px solid ${error ? 'var(--red)' : 'var(--line)'}`,
          background: 'var(--card)', cursor: 'pointer',
          transition: 'border-color .2s, box-shadow .2s',
          minHeight: 44, boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => { if (!open && !error) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--blue-border)'; }}
        onMouseLeave={(e) => { if (!open && !error) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)'; }}
      >
        <span style={{ fontSize: 14, color: 'var(--ink)', flex: 1 }}>{selected?.code || '+1'}</span>
        <svg
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.5" strokeLinecap="round"
          style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : undefined }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 260, zIndex: 30,
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 11,
          boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 6px 0' }}>
            <input
              ref={inputRef}
              type="text"
              aria-label="Search country code"
              placeholder="Search code or country…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); }}
              onKeyDown={onKey}
              style={{
                width: '100%', padding: '8px 10px', border: '1px solid var(--line)',
                borderRadius: 8, fontFamily: 'inherit', fontSize: 13,
                color: 'var(--ink)', background: 'var(--paper)',
                outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--line)'; }}
            />
          </div>
          <div
            role="listbox"
            aria-label={ariaLabel}
            style={{ maxHeight: 220, overflow: 'auto', padding: 4 }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 12.5, color: 'var(--ink-faint)', textAlign: 'center' }}>No matches</div>
            ) : (
              filtered.map((c, i) => (
                <div
                  key={c.code}
                  id={optId(i)}
                  role="option"
                  aria-selected={c.code === value}
                  onMouseDown={(e) => { e.preventDefault(); choose(c.code); }}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: c.code === value ? 700 : 500,
                    color: c.code === value ? 'var(--blue-deep)' : 'var(--ink)',
                    background: i === active ? 'var(--paper)' : 'transparent',
                    transition: 'background .1s',
                  }}
                >
                  <span style={{ color: 'var(--ink-faint)', fontWeight: 600, minWidth: 42 }}>{c.code}</span>
                  <span style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>{c.label.replace(/^.\d{1,3}\s{2}/, '')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
