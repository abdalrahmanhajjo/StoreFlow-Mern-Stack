import { Logo } from '@/components/ui';

// Full-screen loading state shown while the initial silent refresh resolves.
export function Loader() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ animation: 'sf-pulse 1.2s ease-in-out infinite' }}>
          <Logo size={44} />
        </div>
        <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Loading…</span>
      </div>
      <style>{`@keyframes sf-pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}
