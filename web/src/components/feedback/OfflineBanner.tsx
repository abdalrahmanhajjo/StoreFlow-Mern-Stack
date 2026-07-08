import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const on = () => { setOffline(false); setVisible(false); };
    const off = () => { setOffline(true); setVisible(true); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <>
      {visible && (
        <style>{`
          @keyframes sfSlideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
          .sf-offline-banner { animation: sfSlideDown .35s ease-out; }
          @media (prefers-reduced-motion: reduce) { .sf-offline-banner { animation: none; } }
        `}</style>
      )}
      <div role="status" className="sf-offline-banner" style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--red)', color: '#fff', textAlign: 'center', padding: '8px 12px', fontSize: 12.5, fontWeight: 600, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span>You are offline — changes will sync when the connection returns.</span>
      </div>
    </>
  );
}
