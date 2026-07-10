import { Link } from 'react-router-dom';
import { SearchGlobe, LockIcon } from '@/components/feedback/ErrorIllustrations';

function Shell({ code, title, msg, icon }: { code: string; title: string; msg: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', padding: 24, background: 'var(--paper)' }}>
      <div style={{ maxWidth: 380 }}>
        <div style={{ marginBottom: 8 }}>{icon}</div>
        <div className="display" style={{ fontSize: 56, fontWeight: 800, color: code === '403' ? 'var(--red-bright)' : 'var(--blue)' }}>{code}</div>
        <h1 className="display" style={{ color: 'var(--ink)', margin: '4px 0 8px', fontSize: 22 }}>{title}</h1>
        <p style={{ color: 'var(--ink-soft)', margin: '0 0 24px', fontSize: 14, lineHeight: 1.5 }}>{msg}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link to="/dashboard" style={{ background: 'var(--ink)', color: 'var(--card)', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
            Go to dashboard
          </Link>
          {code !== '403' && (
            <Link to="/login" style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export const Forbidden = () => (
  <Shell
    code="403"
    title="No access"
    msg="You don't have permission to view this page. Contact your admin if you believe this is a mistake."
    icon={<LockIcon />}
  />
);

export const NotFound = () => (
  <Shell
    code="404"
    title="Not found"
    msg="We couldn't find the page you're looking for. It may have been moved or deleted."
    icon={<SearchGlobe />}
  />
);
