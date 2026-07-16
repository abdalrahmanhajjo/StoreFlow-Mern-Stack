import { useState, useRef, useId, useEffect, type KeyboardEvent } from 'react';
import { useCustomers, type Customer } from '@/features/customers/customersStore';
import { tierFor, TierBadge } from '@/components/ui';
import { money, points as fmtPoints } from '@/lib/format';

const AVATARS = ['#131312', '#5c4f66', '#8a5560', '#c93d2e', '#9a6635', '#8a6420', '#2e7d43', '#4f6d70'];

function initials(name: string): string {
  return name.split(' ').map((s) => s[0]).join('').toUpperCase().slice(0, 2) || '?';
}
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATARS[Math.abs(h) % AVATARS.length];
}

// Mirrors the server's customer phone rule so a bad number is caught at the
// register instead of failing the create call.
const PHONE_RE = /^[0-9+\-\s()]{6,20}$/;

interface Props {
  onSelect: (c: Customer) => void;
  onCreate: (name: string, phone?: string) => void;
}

export function CustomerSearch({ onSelect, onCreate }: Props) {
  const searchFn = useCustomers((s) => s.search);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [formErr, setFormErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const results = searchFn(query);
  const exact = results.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim().length > 0 && !exact;
  const total = results.length + (showCreate ? 1 : 0);

  const choose = (i: number) => {
    if (showCreate && i === results.length) {
      // Don't create yet — ask for the phone number first.
      setCreating(true);
      setNewName(query.trim());
      setNewPhone('');
      setFormErr('');
      setTimeout(() => phoneRef.current?.focus(), 50);
      return;
    }
    if (results[i]) {
      onSelect(results[i]);
    }
    setQuery('');
    setOpen(false);
  };

  const cancelCreate = () => {
    setCreating(false);
    setFormErr('');
    ref.current?.focus();
  };

  const submitCreate = () => {
    const name = newName.trim();
    const phone = newPhone.trim();
    if (name.length < 2) {
      setFormErr('Name must be at least 2 characters');
      return;
    }
    if (phone && !PHONE_RE.test(phone)) {
      setFormErr('Phone must be 6–20 characters: digits, +, -, spaces or parentheses');
      return;
    }
    onCreate(name, phone || undefined);
    setCreating(false);
    setQuery('');
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (creating) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, total - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const fieldStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8,
    fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
  } as const;
  const labelStyle = {
    display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', margin: '0 0 4px',
  } as const;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 9, padding: '0 11px', transition: 'border-color .15s', outline: `1px solid ${open ? 'var(--blue-border)' : 'transparent'}` }}>
        <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>🔍</span>
        <input
          ref={ref}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && total > 0 ? `${listId}-opt-${active}` : undefined}
          aria-label="Search customer"
          value={query}
          placeholder="Search customer by name or phone…"
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); setCreating(false); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          style={{ border: 'none', outline: 'none', width: '100%', padding: '9px 0', fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'transparent' }}
        />
      </div>

      {open && creating && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 20, padding: 14 }}>
          <form onSubmit={(e) => { e.preventDefault(); submitCreate(); }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px' }}>New customer</p>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle} htmlFor={`${listId}-new-name`}>Name</label>
              <input
                id={`${listId}-new-name`}
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setFormErr(''); }}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelCreate(); }}
                style={fieldStyle}
              />
            </div>
            <div style={{ marginBottom: formErr ? 6 : 12 }}>
              <label style={labelStyle} htmlFor={`${listId}-new-phone`}>Phone number</label>
              <input
                id={`${listId}-new-phone`}
                ref={phoneRef}
                type="tel"
                inputMode="tel"
                placeholder="+1 555 123 4567"
                value={newPhone}
                onChange={(e) => { setNewPhone(e.target.value); setFormErr(''); }}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelCreate(); }}
                style={fieldStyle}
              />
            </div>
            {formErr && <p role="alert" style={{ fontSize: 12, color: 'var(--red)', margin: '0 0 10px' }}>{formErr}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={cancelCreate}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}
              >
                Add customer
              </button>
            </div>
          </form>
        </div>
      )}

      {open && !creating && (query || results.length > 0) && (
        <div
          id={listId}
          role="listbox"
          style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-md)', zIndex: 20, maxHeight: 280, overflow: 'auto', padding: 4 }}
        >
          {results.map((c, i) => {
            const tier = tierFor(c.points);
            return (
              <div
                key={c.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); choose(i); }}
                onMouseEnter={() => setActive(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', background: i === active ? 'var(--paper)' : '' }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: hashColor(c.name), color: '#f4f4f1', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {initials(c.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c.name}</span>
                    <TierBadge tier={tier} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                    {fmtPoints(c.points)} pts · {money(c.spent)} spent
                    {c.phone && ` · ${c.phone}`}
                  </div>
                </div>
              </div>
            );
          })}
          {showCreate && (
            <div
              id={`${listId}-opt-${results.length}`}
              role="option"
              aria-selected={active === results.length}
              onMouseDown={(e) => { e.preventDefault(); choose(results.length); }}
              onMouseEnter={() => setActive(results.length)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', color: 'var(--blue-deep)', fontWeight: 600, fontSize: 13, background: active === results.length ? 'var(--blue-soft)' : '' }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Add new “{query.trim()}”
            </div>
          )}
        </div>
      )}
    </div>
  );
}
