import { create } from 'zustand';
import { useEffect, useState, useCallback, useRef } from 'react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  title?: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant, title?: string, duration?: number) => void;
  remove: (id: number) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = 'success', title, duration) =>
    set((s) => ({ toasts: [...s.toasts, { id: ++counter, message, variant, title, duration }] })),
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = Object.assign(
  (message: string, variant?: ToastVariant, title?: string, duration?: number) =>
    useToastStore.getState().push(message, variant, title, duration),
  {
    success: (message: string, title?: string) => useToastStore.getState().push(message, 'success', title),
    error: (message: string, title?: string) => useToastStore.getState().push(message, 'error', title, 8000),
    info: (message: string, title?: string) => useToastStore.getState().push(message, 'info', title),
    warning: (message: string, title?: string) => useToastStore.getState().push(message, 'warning', title, 6000),
  }
);

const VARIANT: Record<ToastVariant, { bg: string; border: string; icon: string; iconColor: string; barColor: string }> = {
  success: { bg: '#065f46', border: '#059669', icon: 'M20 6L9 17l-5-5', iconColor: '#34d399', barColor: '#34d399' },
  error: { bg: '#7f1d1d', border: '#dc2626', icon: 'M18 6L6 18M6 6l12 12', iconColor: '#f87171', barColor: '#f87171' },
  info: { bg: '#1e3a5f', border: '#2563eb', icon: 'M12 16v-4M12 8h.01', iconColor: '#60a5fa', barColor: '#60a5fa' },
  warning: { bg: '#5c3d0e', border: '#d97706', icon: 'M12 9v4M12 17h.01', iconColor: '#fbbf24', barColor: '#fbbf24' },
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
    setTimeout(() => remove(t.id), 250);
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
  const pct = paused ? (remainingRef.current / totalMs) * 100 : ((totalMs - elapsed) / totalMs) * 100;

  return (
    <div
      role={t.variant === 'error' ? 'alert' : 'status'}
      aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => { remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startRef.current)); setPaused(true); }}
      onMouseLeave={() => { startRef.current = Date.now(); setPaused(false); }}
      onClick={dismiss}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
        background: v.bg, color: '#fff', borderRadius: 12, fontSize: 13, fontWeight: 500,
        maxWidth: 380, border: `1px solid ${v.border}`, position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 24px -6px rgba(0,0,0,0.3), 0 2px 6px -2px rgba(0,0,0,0.2)',
        opacity: exiting ? 0 : 1, transform: exiting ? 'translateX(30px)' : 'translateX(0)',
        transition: 'opacity .25s ease, transform .25s ease',
        animation: 'sf-toast-in .35s ease-out',
      }}
    >
      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, height: 2.5,
        width: `${pct}%`, background: v.barColor,
        transition: 'width .3s linear', borderRadius: '0 2px 0 0',
        opacity: paused ? 0.4 : 0.7,
      }} />

      <span aria-hidden style={{
        width: 26, height: 26, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
        background: `${v.iconColor}22`,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={v.iconColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={v.icon} />
        </svg>
      </span>

      <div style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
        {t.title && <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700 }}>{t.title}</p>}
        <p style={{ margin: t.title ? '2px 0 0' : 0, opacity: 0.9, lineHeight: 1.4 }}>{t.message}</p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); dismiss(); }}
        aria-label="Dismiss"
        style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)',
          cursor: 'pointer', borderRadius: 6, width: 22, height: 22, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
          fontSize: 14, lineHeight: 1,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <>
      <style>{`
        @keyframes sf-toast-in {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-toast-in { animation: none; }
        }
      `}</style>
      <div style={{
        position: 'fixed', right: 20, bottom: 20, display: 'flex',
        flexDirection: 'column', gap: 10, zIndex: 1000, maxWidth: 380,
      }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </div>
    </>
  );
}
