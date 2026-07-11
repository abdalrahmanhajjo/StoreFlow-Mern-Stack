import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive and focus Cancel by default. */
  danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
  id: number;
  resolve: (ok: boolean) => void;
}

interface ConfirmState {
  current: ConfirmRequest | null;
  request: (opts: ConfirmOptions) => Promise<boolean>;
  settle: (ok: boolean) => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  request: (opts) =>
    new Promise<boolean>((resolve) => {
      // If a dialog is already open, resolve it as cancelled first.
      const existing = get().current;
      if (existing) existing.resolve(false);
      set({ current: { ...opts, id: Date.now() + Math.random(), resolve } });
    }),
  settle: (ok) => {
    const cur = get().current;
    if (!cur) return;
    cur.resolve(ok);
    set({ current: null });
  },
}));

/**
 * Promise-based confirmation. Accessible replacement for `window.confirm`:
 * uses the focus-trapping Modal, is themeable, keyboard-complete and announced
 * as a dialog. Requires <ConfirmDialogHost/> mounted once near the app root.
 *
 *   if (await confirm({ title: 'Delete product?', danger: true })) { … }
 */
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(opts);
}

export function ConfirmDialogHost() {
  const current = useConfirmStore((s) => s.current);
  const settle = useConfirmStore((s) => s.settle);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);

  // Focus the safe default: Cancel for destructive actions, Confirm otherwise.
  useEffect(() => {
    if (!current) return;
    const target = current.danger ? cancelBtn.current : confirmBtn.current;
    target?.focus();
  }, [current]);

  if (!current) return null;

  return (
    <Modal open onClose={() => settle(false)} title={current.title}>
      {current.message && (
        <p style={{ margin: '0 0 18px', color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.55 }}>{current.message}</p>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button ref={cancelBtn} variant="ghost" onClick={() => settle(false)}>
          {current.cancelLabel ?? 'Cancel'}
        </Button>
        <Button ref={confirmBtn} variant={current.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
          {current.confirmLabel ?? 'Confirm'}
        </Button>
      </div>
    </Modal>
  );
}
