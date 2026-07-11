import { type CSSProperties } from 'react';

interface ProgressBarProps {
  value?: number;
  max?: number;
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  indeterminate?: boolean;
  style?: CSSProperties;
}

export function ProgressBar({
  value = 0,
  max = 100,
  color = 'var(--blue)',
  height = 6,
  label,
  showPercent,
  indeterminate,
  style,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div style={{ width: '100%', ...style }} role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={max} aria-label={label || 'Progress'}>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {label && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>}
          {showPercent && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{
        width: '100%', height, borderRadius: height / 2,
        background: 'var(--paper-dim)', overflow: 'hidden',
      }}>
        <div
          style={{
            height: '100%', borderRadius: height / 2,
            background: color,
            width: indeterminate ? '40%' : `${pct}%`,
            animation: indeterminate ? 'sf-progress-indeterminate 1.4s ease-in-out infinite' : undefined,
            transition: 'width .4s ease',
            boxShadow: `0 0 6px ${color}55`,
          }}
        />
      </div>
      <style>{`
        @keyframes sf-progress-indeterminate {
          0% { transform: translateX(-100%); width: 40%; }
          50% { transform: translateX(0); width: 60%; }
          100% { transform: translateX(250%); width: 40%; }
        }
        @media (prefers-reduced-motion: reduce) {
          div[style*="sf-progress-indeterminate"] { animation: none !important; width: 50% !important; }
        }
      `}</style>
    </div>
  );
}
