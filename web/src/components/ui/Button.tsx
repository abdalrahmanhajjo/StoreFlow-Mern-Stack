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
  transition: 'background .14s, box-shadow .14s, transform .05s',
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: { background: 'linear-gradient(180deg,#3B82F6,#2563EB)', color: '#fff', boxShadow: '0 4px 12px -3px rgba(37,99,235,.5)' },
  ghost: { background: 'var(--card)', color: 'var(--ink)', borderColor: 'var(--line)' },
  dark: { background: 'var(--navy)', color: '#fff' },
  danger: { background: 'var(--red)', color: '#fff' },
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
