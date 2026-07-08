import { useEffect, useRef } from 'react';

export function SkipLink() {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && document.activeElement === ref.current) {
        ref.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <a
      ref={ref}
      href="#main-content"
      style={{
        position: 'fixed', top: -100, left: 8, zIndex: 9999,
        background: '#fff', color: '#2563EB', fontWeight: 700, fontSize: 13,
        padding: '10px 18px', borderRadius: 8, textDecoration: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,.15)',
        transition: 'top .15s',
      }}
      onFocus={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = '8px'; }}
      onBlur={(e) => { (e.currentTarget as HTMLAnchorElement).style.top = '-100px'; }}
    >
      Skip to main content
    </a>
  );
}
