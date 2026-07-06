import { useEffect, useId, useState, type ReactNode } from 'react';
import { createFormatters } from '@/lib/i18n/format';
import { parseLocaleNumber } from '@/lib/i18n/parse';

export interface MoneyInputProps {
  label: string;
  /** Amount in currency major units (e.g. pounds), or null when empty. */
  value: number | null;
  onChange: (value: number | null) => void;
  currency: string;
  locale?: string;
  id?: string;
  name?: string;
  error?: string;
  hint?: ReactNode;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  /** Called on blur with the parsed value, useful for validation triggers. */
  onCommit?: (value: number | null) => void;
}

// Accessible, locale-aware money field.
// - Label is programmatically associated (no placeholder-as-label).
// - inputMode="decimal" surfaces the numeric keypad on mobile.
// - Accepts locale decimal/group separators and pasted currency strings
//   (paste is never blocked).
// - Shows a formatted preview so the user sees the interpreted amount.
export function MoneyInput({
  label,
  value,
  onChange,
  currency,
  locale = 'en-GB',
  id,
  name,
  error,
  hint,
  min,
  max,
  required,
  disabled,
  onCommit,
}: MoneyInputProps) {
  const reactId = useId();
  const inputId = id ?? `money-${reactId}`;
  const errorId = `${inputId}-err`;
  const hintId = `${inputId}-hint`;
  const previewId = `${inputId}-preview`;
  const fmt = createFormatters(locale, currency);

  // Local text state so the user can type freely; parsed number is lifted up.
  const [text, setText] = useState<string>(value == null ? '' : String(value));

  // Keep the field in sync if the value is changed programmatically.
  useEffect(() => {
    const parsed = parseLocaleNumber(text, locale);
    if (value == null && text !== '') return; // user is mid-edit
    if (parsed !== value) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const rangeError =
    value != null &&
    ((min != null && value < min) || (max != null && value > max))
      ? `Enter an amount${min != null ? ` of at least ${fmt.money(min)}` : ''}${max != null ? ` up to ${fmt.money(max)}` : ''}.`
      : undefined;
  const shownError = error ?? rangeError;

  const describedBy = [hint ? hintId : null, value != null ? previewId : null, shownError ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  const commit = (raw: string) => {
    const parsed = parseLocaleNumber(raw, locale);
    onChange(parsed);
    onCommit?.(parsed);
  };

  return (
    <div style={{ marginBlockEnd: 16 }}>
      <label htmlFor={inputId} style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBlockEnd: 7 }}>
        {label}
        {required && <span aria-hidden style={{ color: 'var(--red)', marginInlineStart: 4 }}>*</span>}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span aria-hidden style={{ position: 'absolute', insetInlineStart: 12, color: 'var(--ink-faint)', fontSize: 13 }}>
          {fmt.money(0).replace(/[\d.,\s]/g, '') || currency}
        </span>
        <input
          id={inputId}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={text}
          disabled={disabled}
          required={required}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setText(e.target.value);
            onChange(parseLocaleNumber(e.target.value, locale));
          }}
          onBlur={(e) => commit(e.target.value)}
          style={{
            width: '100%',
            paddingBlock: 12,
            paddingInlineStart: 34,
            paddingInlineEnd: 13,
            background: 'var(--card)',
            border: `1px solid ${shownError ? 'var(--red)' : 'var(--line)'}`,
            borderRadius: 11,
            fontFamily: 'inherit',
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--ink)',
          }}
        />
      </div>
      {hint && !shownError && (
        <div id={hintId} style={{ color: 'var(--ink-faint)', fontSize: 12, marginBlockStart: 5 }}>{hint}</div>
      )}
      {value != null && !shownError && (
        <div id={previewId} style={{ color: 'var(--ink-soft)', fontSize: 12, marginBlockStart: 5 }}>
          {fmt.money(value)}
        </div>
      )}
      {shownError && (
        <div id={errorId} role="alert" style={{ color: 'var(--red)', fontSize: 12, marginBlockStart: 5 }}>{shownError}</div>
      )}
    </div>
  );
}
