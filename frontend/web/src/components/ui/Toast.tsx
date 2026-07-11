import { create } from 'zustand';
import { useEffect, useState, useCallback, useRef } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Action {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  title?: string;
  duration?: number;
  action?: Action;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant, title?: string, duration?: number, action?: Action) => void;
  remove: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = 'success', title, duration, action) =>
    set((s) => {
      const next: Toast = { id: ++counter, message, variant, title, duration, action };
      const toasts = [...s.toasts, next];
      if (toasts.length > 5) toasts.splice(0, toasts.length - 5);
      return { toasts };
    }),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = Object.assign(
  (message: string, variant?: ToastVariant, title?: string, duration?: number, action?: Action) =>
    useToastStore.getState().push(message, variant, title, duration, action),
  {
    success: (message: string, title?: string, action?: Action) =>
      useToastStore.getState().push(message, 'success', title, undefined, action),
    error: (message: string, title?: string, action?: Action) =>
      useToastStore.getState().push(message, 'error', title, 8000, action),
    info: (message: string, title?: string, action?: Action) =>
      useToastStore.getState().push(message, 'info', title, undefined, action),
    warning: (message: string, title?: string, action?: Action) =>
      useToastStore.getState().push(message, 'warning', title, 6000, action),
  }
);

const VARIANT: Record<ToastVariant, {
  block: string; bar: string; icon: string;
}> = {
  success: {
    block: 'var(--green)', bar: 'var(--green-bright)',
    icon: 'M20 6L9 17l-5-5',
  },
  error: {
    block: 'var(--red)', bar: 'var(--red-bright)',
    icon: 'M18 6L6 18M6 6l12 12',
  },
  info: {
    block: 'var(--ink)', bar: 'var(--ink-strong)',
    icon: 'M12 16v-4M12 8h.01',
  },
  warning: {
    block: 'var(--amber)', bar: 'var(--amber-bright)',
    icon: 'M12 9v4M12 17h.01',
  },
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000, info: 4000, warning: 6000, error: 8000,
};

function ToastItem({ t }: { t: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const v = VARIANT[t.variant];
  const [paused, setPaused] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startRef = useRef(Date.now());
  const remainingRef = useRef(t.duration ?? DEFAULT_DURATION[t.variant]);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => remove(t.id), 300);
  }, [t.id, remove]);

  useEffect(() => {
    if (paused) return;
    const elapsed = Date.now() - startRef.current;
    const ms = Math.max(0, remainingRef.current - elapsed);
    if (ms <= 0) { dismiss(); return; }
    const id = setTimeout(dismiss, ms);
    return () => clearTimeout(id);
  }, [paused, dismiss]);

  const totalMs = t.duration ?? DEFAULT_DURATION[t.variant];
  const elapsed = Math.min(Date.now() - startRef.current, totalMs);
  const pct = paused
    ? (remainingRef.current / totalMs) * 100
    : ((totalMs - elapsed) / totalMs) * 100;

  return (
    <div
      role={t.variant === 'error' ? 'alert' : 'status'}
      aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => { remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startRef.current)); setPaused(true); }}
      onMouseLeave={() => { startRef.current = Date.now(); setPaused(false); }}
      onClick={dismiss}
      style={{
        display: 'flex', alignItems: 'stretch',
        background: 'var(--card)', color: 'var(--ink)',
        borderRadius: 10, fontSize: 13, fontWeight: 500,
        maxWidth: 400, width: '100%',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 6px 20px -8px rgba(0,0,0,0.2), 0 1px 4px -2px rgba(0,0,0,0.08)',
        border: '1px solid var(--line)',
        cursor: 'pointer',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(-6px) scale(.97)' : 'translateY(0) scale(1)',
        transition: 'opacity .25s ease, transform .3s cubic-bezier(.4,0,.2,1)',
        animation: 'sf-toast-in .4s cubic-bezier(.16,1,.3,1)',
      }}
    >
      {/* Color block left */}
      <div style={{
        width: 44, minHeight: '100%', flexShrink: 0,
        background: v.block, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={v.icon} />
        </svg>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1, minWidth: 0, padding: '13px 14px 13px 12px',
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        {t.title && (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.01em' }}>{t.title}</div>
        )}
        <div style={{
          fontSize: t.title ? 12 : 12.5,
          color: t.title ? 'var(--ink-faint)' : 'var(--ink-soft)',
          lineHeight: 1.45,
        }}>
          {t.message}
        </div>
        {t.action && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); t.action!.onClick(); dismiss(); }}
            style={{
              background: 'none', border: 'none', color: v.block,
              fontWeight: 700, fontSize: 11.5, cursor: 'pointer',
              padding: 0, marginTop: 6, fontFamily: 'inherit',
              letterSpacing: '.02em', textTransform: 'uppercase',
            }}
          >
            {t.action.label}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Dismiss"
        style={{
          background: 'none', border: 'none', color: 'var(--ink-faint-alt)',
          cursor: 'pointer', width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, margin: 8, borderRadius: 6,
          transition: 'background .12s, color .12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--paper-dim)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint-alt)'; }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Progress bar at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: 'var(--paper-dim)',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: v.bar,
          transition: paused ? 'none' : 'width .3s linear',
        }} />
      </div>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <>
      <style>{`
        @keyframes sf-toast-in {
          from { opacity: 0; transform: translateY(-10px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation"] { animation: none !important; }
          [style*="transition"] { transition: none !important; }
        }
      `}</style>
      <div style={{
        position: 'fixed', top: 20, right: 24, display: 'flex',
        flexDirection: 'column', gap: 10, zIndex: 9999,
        maxWidth: 400, width: '100%',
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto', width: '100%' }}>
            <ToastItem t={t} />
          </div>
        ))}
      </div>
    </>
  );
}
