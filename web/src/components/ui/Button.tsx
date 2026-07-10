import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'dark' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

const base: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  borderRadius: 10,
  border: '1px solid transparent',
  fontWeight: 600,
  letterSpacing: '.01em',
  transition: 'background .14s, box-shadow .14s, transform .05s, border-color .14s',
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--ink)', color: 'var(--card)' },
  ghost: { background: 'var(--card)', color: 'var(--ink)', borderColor: 'var(--ink)' },
  dark: { background: 'var(--ink)', color: 'var(--card)' },
  danger: { background: 'var(--red)', color: 'var(--card)' },
};

const sizes: Record<Size, React.CSSProperties> = {
  sm: { padding: '7px 12px', fontSize: 12 },
  md: { padding: '10px 16px', fontSize: 13.5 },
};

// SF-014b: Button primitive (forwards ref so callers can manage focus)
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading,
    fullWidth,
    leftIcon,
    children,
    disabled,
    style,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      style={{
        ...base,
        ...variants[variant],
        ...sizes[size],
        width: fullWidth ? '100%' : undefined,
        opacity: disabled || isLoading ? 0.7 : 1,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {isLoading ? <><Spinner size="sm" color="currentColor" />{children}</> : (<>{leftIcon}{children}</>)}
    </button>
  );
});
