import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NAV } from '@/app/navConfig';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSession } from '@/store/session';
import { StoreProfileProvider } from '@/config/StoreProfileContext';
import { authRoleToStoreRole } from '@/config/roleMap';
import { getMockStore } from '@/mocks';

// Provides the resolved StoreProfile (template config + locale formatters +
// dir/lang) for the signed-in user's business type. Additive: legacy components
// are unaffected; config-driven components (POS, dispensing) read from it.
function StoreProfileGate({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  const businessType = user?.businessType ?? 'supermarket';
  const role = user ? authRoleToStoreRole(user.role) : 'cashier';
  const { profile } = getMockStore(businessType);
  return (
    <StoreProfileProvider profile={profile} role={role}>
      {children}
    </StoreProfileProvider>
  );
}

// SF-201: responsive shell (sticky sidebar on desktop, drawer on mobile)
export function AppShell() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  const title = NAV.find((i) => i.path === location.pathname)?.label ?? 'StoreFlow';

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <StoreProfileGate>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {!isMobile && <Sidebar />}
        {isMobile && drawer && (
          <>
            <div onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.4)', zIndex: 40 }} />
            <div style={{ position: 'fixed', top: 0, insetInlineStart: 0, zIndex: 50 }}>
              <Sidebar onNavigate={() => setDrawer(false)} />
            </div>
          </>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar title={title} onMenu={() => setDrawer(true)} showMenu={isMobile} />
          <main style={{ padding: '26px 28px 64px', maxWidth: 1280, width: '100%' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </StoreProfileGate>
  );
}
