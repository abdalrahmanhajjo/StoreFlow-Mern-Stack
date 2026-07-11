import { useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (val: string) => void;
  onBarcodeScan?: (code: string) => void;
}

export function SearchField({ value, onChange, onBarcodeScan, placeholder = 'Search…', onKeyDown, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() && onBarcodeScan) {
      const trimmed = value.trim();
      if (/^\d{8,}$/.test(trimmed)) {
        onBarcodeScan(trimmed);
      }
    }
    onKeyDown?.(e);
  };

  return (
    <>
      <style>{`
        .sf-search { transition: border-color .15s, box-shadow .15s; }
        .sf-search:focus-within { border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-soft); }
        .sf-search-clear { transition: opacity .15s, transform .15s; }
        .sf-search-clear:hover { transform: scale(1.15); }
        @media (prefers-reduced-motion: reduce) {
          .sf-search, .sf-search-clear { transition: none; }
        }
      `}</style>
      <div
        className="sf-search"
        role="combobox"
        aria-expanded={false}
        aria-haspopup="listbox"
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--card)', border: `1px solid ${focused ? 'var(--blue)' : 'var(--line)'}`,
          borderRadius: 11, padding: '0 14px',
          height: 44, position: 'relative',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholder={placeholder}
          aria-label={rest['aria-label'] || 'Search products'}
          style={{
            border: 'none', outline: 'none', width: '100%', fontSize: 13.5,
            fontFamily: 'inherit', color: 'var(--ink)', background: 'transparent',
            lineHeight: 1,
          }}
        />
        {value && (
          <button
            type="button"
            className="sf-search-clear"
            onClick={() => onChange('')}
            aria-label="Clear search"
            style={{
              background: 'var(--paper-dim)', border: 'none', borderRadius: '50%',
              width: 20, height: 20, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
