import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui';

/** Shared frame for the legal/policy pages: minimal top bar, editorial
 * prose column, register-style sign-off. Theme-aware via tokens. */
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', color: 'var(--ink)' }}>
      <style>{`
        .sf-legal-shell { width: min(100%, 760px); margin: 0 auto; padding: 0 clamp(20px, 4vw, 40px); }
        .sf-legal-nav {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 18px 0; border-bottom: 1px solid var(--line);
        }
        .sf-legal-brand { display: inline-flex; align-items: center; gap: 9px; color: var(--ink); font-weight: 800; font-size: 16px; }
        .sf-legal-back {
          border: 1px solid var(--blue-border); border-radius: 999px; padding: 8px 18px;
          font-size: 12.5px; font-weight: 600; color: var(--ink); background: var(--card);
          transition: border-color .15s ease;
        }
        .sf-legal-back:hover { border-color: var(--ink); }
        .sf-legal-head { padding: clamp(40px, 7vw, 72px) 0 0; }
        .sf-legal-head h1 {
          margin: 0; font-size: clamp(2rem, 4.5vw, 3.2rem); font-weight: 800;
          letter-spacing: -0.03em; line-height: 1.05; text-wrap: balance;
        }
        .sf-legal-head p { margin: 12px 0 0; font-size: 12.5px; color: var(--ink-faint); }
        .sf-legal-body { padding: clamp(28px, 4vw, 44px) 0 64px; }
        .sf-legal-body h2 {
          margin: 34px 0 10px; font-size: 18px; font-weight: 700; letter-spacing: -0.015em;
        }
        .sf-legal-body h2:first-child { margin-top: 0; }
        .sf-legal-body p, .sf-legal-body li {
          margin: 0 0 12px; font-size: 14.5px; line-height: 1.7; color: var(--ink-soft);
          max-width: 68ch; text-wrap: pretty;
        }
        .sf-legal-body ul { margin: 0 0 12px; padding-inline-start: 20px; }
        .sf-legal-body li { margin-bottom: 6px; }
        .sf-legal-foot {
          border-top: 1px solid var(--line); padding: 16px 0 28px;
          display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 20px;
          font-size: 11.5px; color: var(--ink-faint);
        }
        .sf-legal-foot a { color: var(--ink-soft); font-weight: 600; }
        .sf-legal-foot a:hover { color: var(--ink); }
      `}</style>
      <div className="sf-legal-shell">
        <header className="sf-legal-nav">
          <Link to="/" className="sf-legal-brand" aria-label="StoreFlow home">
            <Logo size={28} />
            <span>StoreFlow</span>
          </Link>
          <Link to="/" className="sf-legal-back">← Back to home</Link>
        </header>
        <main>
          <div className="sf-legal-head">
            <h1 className="display">{title}</h1>
            <p>Last updated {updated}</p>
          </div>
          <div className="sf-legal-body">{children}</div>
        </main>
        <footer className="sf-legal-foot">
          <span>One counter, every till. © {new Date().getFullYear()} StoreFlow.</span>
          <span>
            <Link to="/terms">Terms</Link> · <Link to="/privacy">Privacy</Link> ·{' '}
            <Link to="/security">Security</Link> · <Link to="/legal">Legals</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
