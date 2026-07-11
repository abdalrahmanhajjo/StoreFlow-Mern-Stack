import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SkipLink } from './SkipLink';
import { NAV } from '@/app/navConfig';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSession } from '@/store/session';
import { StoreProfileProvider } from '@/config/StoreProfileContext';
import { authRoleToStoreRole } from '@/config/roleMap';
import { getMockStore } from '@/mocks';
import { useStoreIdentity } from '@/lib/api/storeIdentity';
import { useI18n } from '@/store/i18n';

/** In connected mode the store's real identity (name, currency) overlays the
 * business-type template, so the shell and receipts never show demo branding. */
function StoreProfileGate({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  const businessType = user?.businessType ?? 'supermarket';
  const role = user ? authRoleToStoreRole(user.role) : 'cashier';
  const { profile } = getMockStore(businessType);
  const realStore = useStoreIdentity((s) => s.store);
  const storeId = user?.storeId ?? null;
  // Pages format money through the global i18n store (non-reactive reads), so
  // when the real currency arrives we configure it FIRST and then remount the
  // subtree — every page re-renders against the correct formatters.
  const [identityEpoch, setIdentityEpoch] = useState(0);
  useEffect(() => {
    if (storeId) useStoreIdentity.getState().load(storeId);
  }, [storeId]);
  useEffect(() => {
    if (realStore) {
      useI18n.getState().configure(profile.locale, realStore.currency, profile.timezone ?? 'UTC');
      setIdentityEpoch((e) => e + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realStore]);
  const effective = realStore
    ? {
        ...profile,
        name: realStore.name,
        currency: realStore.currency,
        // The store's own configured tax rate (stored as a percent) drives the
        // POS, receipts and reports — not the business-type template default.
        taxProfile: { ...profile.taxProfile, defaultRate: realStore.taxRate / 100 },
      }
    : profile;
  return (
    <StoreProfileProvider key={identityEpoch} profile={effective} role={role}>
      {children}
    </StoreProfileProvider>
  );
}

export function AppShell() {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const prevPath = useRef(location.pathname);

  const title = NAV.find((i) => i.path === location.pathname)?.label ?? 'StoreFlow';

  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      setDrawer(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawer]);

  useEffect(() => {
    if (!drawer) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawer]);

  return (
    <StoreProfileGate>
      <style>{`
        @keyframes sf-drawer-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes sf-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        .sf-drawer { animation: sf-drawer-in .25s ease-out; }
        .sf-overlay { animation: sf-overlay-in .2s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .sf-drawer, .sf-overlay { animation: none; }
        }
      `}</style>
      <SkipLink />
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
        {!isMobile && <Sidebar />}

        {isMobile && drawer && (
          <>
            <div
              className="sf-overlay"
              onClick={() => setDrawer(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(17,17,16,.55)',
                backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                zIndex: 40,
              }}
            />
            <div
              className="sf-drawer"
              style={{
                position: 'fixed', top: 0, insetInlineStart: 0, zIndex: 50,
                boxShadow: '4px 0 24px rgba(0,0,0,.12)',
              }}
            >
              <Sidebar onNavigate={() => setDrawer(false)} />
            </div>
          </>
        )}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Topbar title={title} onMenu={() => setDrawer((d) => !d)} showMenu={isMobile} isOpen={drawer} />
          <main id="main-content" tabIndex={-1} style={{
            padding: '26px 28px 64px', maxWidth: 1280, width: '100%', margin: '0 auto', flex: 1,
          }}>
            <Outlet />
          </main>
        </div>
      </div>
    </StoreProfileGate>
  );
}
