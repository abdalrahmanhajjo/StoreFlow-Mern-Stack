import { type CSSProperties } from 'react';

type SkeletonVariant = 'text' | 'circle' | 'rect';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  borderRadius,
  style,
}: SkeletonProps) {
  const dims: CSSProperties =
    variant === 'circle'
      ? { width: width || 40, height: height || 40, borderRadius: '50%' }
      : variant === 'rect'
        ? { width: width || '100%', height: height || 120, borderRadius: borderRadius || 10 }
        : { width: width || '100%', height: height || 14, borderRadius: borderRadius || 6 };

  return (
    <div
      aria-hidden
      style={{
        background: 'var(--line-soft)',
        position: 'relative',
        overflow: 'hidden',
        ...dims,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: 'sf-shimmer 1.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes sf-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="sf-shimmer"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonGroup({
  count = 3, variant = 'text', style,
}: { count?: number; variant?: SkeletonVariant; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          width={variant === 'text' ? `${70 + (i * 13 % 30)}%` : undefined}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  lines = 3, style,
}: { lines?: number; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        background: 'var(--card)', border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
        padding: 20, ...style,
      }}
    >
      <Skeleton variant="rect" width="60%" height={16} borderRadius={6} style={{ marginBottom: 14 }} />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          width={`${80 + (i * 7 % 20)}%`}
          style={{ marginBottom: i < lines - 1 ? 10 : 0 }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 4, cols = 4, style,
}: { rows?: number; cols?: number; style?: CSSProperties }) {
  return (
    <div aria-hidden style={{ overflowX: 'auto', ...style }}>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12, padding: '11px 20px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--paper)',
      }}>
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} width={`${60 + (i * 10 % 40)}%`} style={{ height: 10 }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{
          display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12, padding: '14px 20px',
          borderBottom: '1px solid var(--line-soft)',
        }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} width={`${50 + ((r * 13 + c * 7) % 50)}%`} style={{ height: 12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
