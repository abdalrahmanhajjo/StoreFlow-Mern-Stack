import { useEffect, useState } from 'react';

// SF-1501: non-blocking connectivity banner.
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--red)', color: '#fff', textAlign: 'center', padding: '7px 12px', fontSize: 12.5, fontWeight: 600, zIndex: 2000 }}>
      You are offline — changes will sync when the connection returns.
    </div>
  );
}
