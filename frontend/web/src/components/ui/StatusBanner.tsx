import type { ReactNode } from 'react';

export type StatusVariant = 'info' | 'success' | 'warning' | 'error' | 'pending';

export interface StatusBannerProps {
  variant: StatusVariant;
  /** Short heading; also used as the region's accessible label. */
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
  /** Optional action, e.g. a manual "Retry" button for a failed sync. */
  action?: ReactNode;
}

// Accessible status/notification banner.
// - error/warning use role="alert" (assertive); others role="status" (polite),
//   so screen readers announce changes appropriately.
// - Status is conveyed by an icon + a text label, never colour alone (WCAG 1.4.1).
// - Uses logical CSS properties so it mirrors correctly in RTL.
const STYLES: Record<StatusVariant, { bg: string; border: string; fg: string; icon: string; label: string }> = {
  info: { bg: 'var(--blue-soft)', border: 'var(--blue-border)', fg: 'var(--ink)', icon: 'ℹ', label: 'Information' },
  success: { bg: 'var(--green-soft)', border: 'var(--green-border)', fg: 'var(--green-deep)', icon: '✓', label: 'Success' },
  warning: { bg: 'var(--amber-soft)', border: 'var(--amber-border)', fg: 'var(--amber-strong)', icon: '⚠', label: 'Warning' },
  error: { bg: 'var(--red-soft)', border: 'var(--red-border)', fg: 'var(--red-deep)', icon: '✕', label: 'Error' },
  pending: { bg: 'var(--paper-dim)', border: 'var(--line)', fg: 'var(--ink-soft)', icon: '⏳', label: 'Pending' },
};

export function StatusBanner({ variant, title, children, onDismiss, action }: StatusBannerProps) {
  const s = STYLES[variant];
  const assertive = variant === 'error' || variant === 'warning';

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.fg,
        borderRadius: 12,
        padding: '12px 14px',
        marginBlockEnd: 12,
      }}
    >
      <span aria-hidden style={{ fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>{s.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
          {/* Text label so status is not colour-only, visible to everyone. */}
          <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{s.label}: </span>
          {title}
        </div>
        {children && <div style={{ fontSize: 13, marginBlockStart: 3, lineHeight: 1.5 }}>{children}</div>}
        {action && <div style={{ marginBlockStart: 10 }}>{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${variant} message`}
          style={{
            flexShrink: 0,
            minWidth: 32,
            minHeight: 32,
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontSize: 16,
            lineHeight: 1,
            cursor: 'pointer',
            borderRadius: 8,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
