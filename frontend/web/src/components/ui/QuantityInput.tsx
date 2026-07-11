import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { clamp, parseLocaleNumber } from '@/lib/i18n/parse';
import type { SellUnit } from '@/lib/contracts/types';

export interface QuantityInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Unit label shown after the field, e.g. "kg". Weight units allow decimals. */
  unit?: SellUnit;
  locale?: string;
  id?: string;
  error?: string;
  disabled?: boolean;
}

const DECIMAL_UNITS: ReadonlySet<SellUnit> = new Set<SellUnit>(['kg', 'g', 'litre', 'ml']);

// Accessible quantity stepper.
// - −/+ buttons are ≥44px touch targets with explicit accessible names.
// - The field is a spinbutton: ArrowUp/ArrowseDown and typing both work.
// - Values are clamped to [min,max]; decimals allowed only for weight/volume.
export function QuantityInput({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  unit,
  locale = 'en-GB',
  id,
  error,
  disabled,
}: QuantityInputProps) {
  const reactId = useId();
  const inputId = id ?? `qty-${reactId}`;
  const errorId = `${inputId}-err`;
  const allowDecimal = unit ? DECIMAL_UNITS.has(unit) : false;

  // Local text buffer so users can type intermediate strings like "2." / "2.5"
  // without the controlled numeric value snapping the field back.
  const [text, setText] = useState(String(value));
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setText(String(value));
  }, [value]);

  const set = (next: number) => {
    const rounded = allowDecimal ? Math.round(next * 1000) / 1000 : Math.round(next);
    onChange(clamp(rounded, min, max));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      set(value + step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      set(value - step);
    }
  };

  const btn: React.CSSProperties = {
    width: 44,
    height: 44,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    lineHeight: 1,
    background: 'var(--card)',
    border: '1px solid var(--line)',
    color: 'var(--ink)',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };

  return (
    <div style={{ marginBlockEnd: 16 }}>
      <label htmlFor={inputId} style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBlockEnd: 7 }}>{label}</label>
      <div style={{ display: 'inline-flex', alignItems: 'stretch', borderRadius: 10, overflow: 'hidden' }}>
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={disabled || value <= min}
          onClick={() => set(value - step)}
          style={{ ...btn, borderStartStartRadius: 10, borderEndStartRadius: 10, borderInlineEnd: 'none' }}
        >
          −
        </button>
        <input
          id={inputId}
          role="spinbutton"
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          value={text}
          disabled={disabled}
          aria-valuemin={min}
          aria-valuemax={max === Number.MAX_SAFE_INTEGER ? undefined : max}
          aria-valuenow={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            editing.current = true;
            setText(e.target.value);
            const parsed = parseLocaleNumber(e.target.value, locale);
            if (parsed != null) set(parsed);
            else if (e.target.value.trim() === '') onChange(min);
          }}
          onBlur={() => {
            editing.current = false;
            setText(String(value));
          }}
          style={{
            width: 64,
            textAlign: 'center',
            border: '1px solid var(--line)',
            background: 'var(--card)',
            fontFamily: 'inherit',
            fontSize: 15,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--ink)',
          }}
        />
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={disabled || value >= max}
          onClick={() => set(value + step)}
          style={{ ...btn, borderStartEndRadius: 10, borderEndEndRadius: 10, borderInlineStart: 'none' }}
        >
          +
        </button>
        {unit && <span style={{ display: 'inline-flex', alignItems: 'center', paddingInline: 10, color: 'var(--ink-faint)', fontSize: 13 }}>{unit}</span>}
      </div>
      {error && <div id={errorId} role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBlockStart: 5 }}>{error}</div>}
    </div>
  );
}
