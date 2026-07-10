import { useEffect, useRef } from 'react';

export function useFocusTrap(active: boolean) {
  const elRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;
    prevRef.current = document.activeElement;

    const el = elRef.current;
    if (!el) return;

    const focusable =
      el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    el.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('keydown', onKey);
      (prevRef.current as HTMLElement)?.focus?.();
    };
  }, [active]);

  return elRef;
}
