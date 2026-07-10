import { useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, toast } from '@/components/ui';

interface Toggles {
  enforce2fa: boolean;
  passwordPolicy: boolean;
  autoSuspend: boolean;
  maintenance: boolean;
}

export default function SystemSettingsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [toggles, setToggles] = useState<Toggles>({ enforce2fa: false, passwordPolicy: true, autoSuspend: true, maintenance: false });
  const [dirty, setDirty] = useState(false);

  const toggle = (k: keyof Toggles) => {
    setToggles((t) => ({ ...t, [k]: !t[k] }));
    setDirty(true);
  };

  const save = () => { setDirty(false); toast('System settings saved'); };

  const stlInput: React.CSSProperties = {
    width: isMobile ? '100%' : 170,
    padding: isMobile ? '11px 14px' : '9px 11px',
    border: '1px solid var(--line)',
    borderRadius: 9,
    fontFamily: 'inherit',
    fontSize: isMobile ? 16 : 13,
    color: 'var(--ink)',
    background: 'var(--card)',
    boxSizing: 'border-box',
  };

  const stlSelect: React.CSSProperties = {
    ...stlInput,
    cursor: 'pointer',
  };

  const Switch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button type="button" role="switch" aria-checked={checked} onClick={() => { onChange(!checked); setDirty(true); }}
      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0, position: 'relative', background: checked ? 'var(--green)' : 'var(--line)', transition: 'background .15s', flexShrink: 0 }}
    >
      <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,.15)', transition: 'transform .15s', transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
    </button>
  );

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>System</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>System settings</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>Platform-wide configuration applied to every store.</p>
        </div>
        <Button onClick={save} disabled={!dirty} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>{dirty ? 'Save changes' : 'Saved'}</Button>
      </div>

      <style>{`
        .sf-sys-card { transition: box-shadow .2s, transform .2s; }
        .sf-sys-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .sf-sys-card { transition: none; }
          .sf-sys-card:hover { transform: none; }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 12 : 18 }}>
        {/* Regional defaults */}
        <div className="sf-sys-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Regional defaults</h3>
          </div>
          <div style={{ padding: isMobile ? '4px 14px 12px' : '4px 18px 12px' }}>
            {[
              { label: 'Default currency', desc: 'Applied to new stores at signup.', el: <select aria-label="Default currency" style={stlSelect} defaultValue="USD"><option>USD — $</option><option>EUR — €</option><option>EGP — E£</option></select> },
              { label: 'Default timezone', desc: 'Used for reports and audit timestamps.', el: <select aria-label="Default timezone" style={stlSelect} defaultValue="UTC"><option>UTC</option><option>Africa/Tripoli</option><option>America/New_York</option></select> },
              { label: 'Global tax rate', desc: 'Override per store in their own settings.', el: <input aria-label="Global tax rate" defaultValue="5.4%" onChange={() => setDirty(true)} style={{ ...stlInput, width: isMobile ? '100%' : 90, textAlign: 'right' }} /> },
            ].map((r) => (
              <Row key={r.label} label={r.label} desc={r.desc} isMobile={isMobile}>{r.el}</Row>
            ))}
          </div>
        </div>

        {/* Security policy */}
        <div className="sf-sys-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Security policy</h3>
          </div>
          <div style={{ padding: isMobile ? '4px 14px 12px' : '4px 18px 12px' }}>
            {[
              { label: 'Enforce two-factor auth', desc: 'Require 2FA for all owners and admins.', key: 'enforce2fa' as const },
              { label: 'Strong password policy', desc: 'Min 8 chars, mixed case, number & symbol.', key: 'passwordPolicy' as const },
              { label: 'Auto-suspend on failed payment', desc: 'Suspend store after 3 failed charges.', key: 'autoSuspend' as const },
            ].map((r) => (
              <Row key={r.label} label={r.label} desc={r.desc} isMobile={isMobile}>
                <Switch checked={toggles[r.key]} onChange={() => toggle(r.key)} />
              </Row>
            ))}
          </div>
        </div>

        {/* Branding */}
        <div className="sf-sys-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Branding</h3>
          </div>
          <div style={{ padding: isMobile ? '4px 14px 12px' : '4px 18px 12px' }}>
            {[
              { label: 'Platform name', desc: 'Shown across the app and emails.', el: <input aria-label="Platform name" defaultValue="StoreFlow" onChange={() => setDirty(true)} style={stlInput} /> },
              { label: 'Accent color', desc: 'Primary brand color.', el: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, borderRadius: 6, background: 'var(--ink)', border: '1px solid var(--line)' }} />
                  <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: isMobile ? 13 : 12.5 }}>#131312</span>
                </span>
              )},
              { label: 'Maintenance mode', desc: 'Temporarily disable tenant logins.', key: 'maintenance' as const },
            ].map((r) => (
              <Row key={r.label} label={r.label} desc={r.desc} isMobile={isMobile}>
                {'key' in r ? <Switch checked={toggles[r.key as keyof Toggles]} onChange={() => toggle(r.key as keyof Toggles)} /> : r.el}
              </Row>
            ))}
          </div>
        </div>

        {/* Email templates */}
        <div className="sf-sys-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Email templates</h3>
          </div>
          <div style={{ padding: isMobile ? '4px 14px 12px' : '4px 18px 12px' }}>
            {[
              { label: 'Welcome / store approved', desc: 'Sent when a new store is activated.' },
              { label: 'Password reset', desc: 'Sent on reset request from any store.' },
              { label: 'Security alert', desc: 'Triggered by suspicious login activity.' },
              { label: 'Payment / billing notices', desc: 'Invoices, failed charges, plan upgrades.' },
            ].map((r) => (
              <Row key={r.label} label={r.label} desc={r.desc} isMobile={isMobile}>
                <Button variant="ghost" size="sm" onClick={() => toast('Opening template editor…')}>Edit</Button>
              </Row>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, desc, isMobile, children }: { label: string; desc: string; isMobile: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: isMobile ? 10 : 16, padding: isMobile ? '14px 0' : '15px 0', borderBottom: '1px solid var(--line-soft)', flexDirection: isMobile ? 'column' : 'row' }}>
      <div>
        <div style={{ fontSize: isMobile ? 13.5 : 13.5, color: 'var(--ink)', fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-faint)', marginTop: 2, maxWidth: 300, lineHeight: 1.4 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}
