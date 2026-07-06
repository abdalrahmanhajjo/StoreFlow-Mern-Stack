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

export function SkeletonGroup({ count = 3, variant = 'text' as SkeletonVariant, style }: { count?: number; variant?: SkeletonVariant; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          key={i}
          variant={variant}
          width={variant === 'text' ? `${70 + Math.random() * 30}%` : undefined}
        />
      ))}
    </div>
  );
}
