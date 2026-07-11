import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  required?: boolean;
}

// SF-014b: Input with label, error, and password show/hide toggle.
// A11y: label is programmatically associated (htmlFor/id), the error/hint are
// linked via aria-describedby, and aria-invalid reflects the error state.
export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, leftIcon, type = 'text', style, id, 'aria-describedby': describedByProp, ...rest },
  ref
) {
  const [show, setShow] = useState(false);
  const reactId = useId();
  const inputId = id ?? `in-${reactId}`;
  const errorId = `${inputId}-err`;
  const hintId = `${inputId}-hint`;
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;

  const describedBy = [describedByProp, hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label htmlFor={inputId} style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>
          {label}
          {rest.required && <span aria-hidden style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {leftIcon && <span aria-hidden style={{ position: 'absolute', left: 12, color: 'var(--ink-faint)', display: 'flex' }}>{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          style={{
            width: '100%',
            padding: `12px ${isPassword ? 42 : 13}px 12px ${leftIcon ? 38 : 13}px`,
            background: 'var(--card)',
            border: `1px solid ${error ? 'var(--red)' : 'var(--line)'}`,
            borderRadius: 11,
            fontFamily: 'inherit',
            fontSize: 14,
            color: 'var(--ink)',
            ...style,
          }}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow((s) => !s)}
            style={{ position: 'absolute', right: 10, background: 'none', border: 'none', color: 'var(--ink-faint)', fontSize: 12, cursor: 'pointer', minHeight: 24, padding: '4px 6px' }}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      {hint && !error && <div id={hintId} style={{ color: 'var(--ink-faint)', fontSize: 12, marginTop: 5 }}>{hint}</div>}
      {error && <div id={errorId} role="alert" style={{ color: 'var(--red)', fontSize: 12, marginTop: 5 }}>{error}</div>}
    </div>
  );
});
