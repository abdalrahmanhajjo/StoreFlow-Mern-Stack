import { useId, useState, useRef, type KeyboardEvent } from 'react';

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  placeholder?: string;
  /** Accessible label for the search field (required for screen readers). */
  label?: string;
  options: ComboOption[];
  onSearch: (query: string) => void;
  onSelect: (value: string) => void;
  onCreate?: (query: string) => void;
}

// SF-014b: SearchCombobox (async options + add-new + keyboard nav).
// A11y: ARIA 1.2 combobox pattern — aria-controls/expanded/activedescendant/autocomplete.
export function SearchCombobox({ placeholder, label, options, onSearch, onSelect, onCreate }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optId = (i: number) => `${listId}-opt-${i}`;

  const exact = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim() !== '' && !exact && !!onCreate;
  const total = options.length + (showCreate ? 1 : 0);

  const choose = (i: number) => {
    if (showCreate && i === options.length) {
      onCreate!(query.trim());
    } else if (options[i]) {
      onSelect(options[i].value);
    }
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, total - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={ref}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && total > 0 ? optId(active) : undefined}
        aria-label={label ?? placeholder ?? 'Search'}
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); onSearch(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        style={{ width: '100%', padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)', background: 'var(--paper)' }}
      />
      {open && (query || options.length > 0) && (
        <div id={listId} role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 20, maxHeight: 224, overflow: 'auto' }}>
          {options.map((o, i) => (
            <div
              key={o.value}
              id={optId(i)}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(i); }}
              style={{ padding: '9px 12px', fontSize: 12.5, cursor: 'pointer', background: i === active ? 'var(--paper)' : undefined }}
            >
              {o.label}{o.hint && <small style={{ color: 'var(--ink-faint)', marginLeft: 6 }}>{o.hint}</small>}
            </div>
          ))}
          {showCreate && (
            <div
              id={optId(options.length)}
              role="option"
              aria-selected={active === options.length}
              onMouseDown={(e) => { e.preventDefault(); choose(options.length); }}
              style={{ padding: '9px 12px', fontSize: 12.5, cursor: 'pointer', color: 'var(--blue-deep)', fontWeight: 600, background: active === options.length ? 'var(--blue-soft)' : undefined }}
            >
              + Add new “{query.trim()}”
            </div>
          )}
        </div>
      )}
    </div>
  );
}
