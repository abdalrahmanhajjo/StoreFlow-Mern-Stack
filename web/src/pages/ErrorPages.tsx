import { Link } from 'react-router-dom';

function Shell({ code, title, msg }: { code: string; title: string; msg: string }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center', padding: 24 }}>
      <div>
        <div className="display" style={{ fontSize: 64, fontWeight: 800, color: 'var(--blue)' }}>{code}</div>
        <h1 className="display" style={{ color: 'var(--ink)', margin: '4px 0 8px' }}>{title}</h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>{msg}</p>
        <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Go to sign in</Link>
      </div>
    </div>
  );
}

export const Forbidden = () => <Shell code="403" title="No access" msg="Your role can't view this page." />;
export const NotFound = () => <Shell code="404" title="Not found" msg="That page doesn't exist." />;
