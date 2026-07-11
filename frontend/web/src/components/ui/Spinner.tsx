import { type CSSProperties } from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  label?: string;
  style?: CSSProperties;
}

const sizes: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 36 };

export function Spinner({ size = 'md', color = 'var(--blue)', label, style }: SpinnerProps) {
  const px = sizes[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }} role="status" aria-label={label || 'Loading'}>
      <svg
        width={px} height={px} viewBox="0 0 24 24" fill="none"
        style={{ animation: 'sf-spin .7s linear infinite', flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" stroke="var(--paper-dim)" strokeWidth="3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{label}</span>}
      <style>{`
        @keyframes sf-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          svg[style*="sf-spin"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
