import { useState } from 'react';
import { Card, Switch, Button, toast } from '@/components/ui';

interface Toggles {
  enforce2fa: boolean;
  passwordPolicy: boolean;
  autoSuspend: boolean;
  maintenance: boolean;
}

// SF-308: platform-wide configuration (client-only draft state).
export default function SystemSettingsPage() {
  const [toggles, setToggles] = useState<Toggles>({ enforce2fa: false, passwordPolicy: true, autoSuspend: true, maintenance: false });
  const [dirty, setDirty] = useState(false);
  const set = (k: keyof Toggles, v: boolean) => { setToggles((t) => ({ ...t, [k]: v })); setDirty(true); };

  const save = () => { setDirty(false); toast('System settings saved'); };

  const selStyle: React.CSSProperties = { width: 160, padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, fontFamily: 'inherit', fontSize: 13, background: 'var(--card)', color: 'var(--ink)' };
  const inputStyle: React.CSSProperties = { width: 150, padding: '9px 11px', border: '1px solid var(--line)', borderRadius: 9, fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>System</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>System settings</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Platform-wide configuration applied to every store.</p>
        </div>
        <Button onClick={save} disabled={!dirty}>{dirty ? 'Save changes' : 'Saved'}</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card>
          <Head title="Regional defaults" />
          <div style={{ padding: '4px 18px 12px' }}>
            <Row label="Default currency" desc="Applied to new stores at signup.">
              <select aria-label="Default currency" style={selStyle} onChange={() => setDirty(true)}><option>USD — $</option><option>EUR — €</option><option>EGP — E£</option></select>
            </Row>
            <Row label="Default timezone" desc="Used for reports and audit timestamps.">
              <select aria-label="Default timezone" style={selStyle} onChange={() => setDirty(true)}><option>UTC</option><option>Africa/Tripoli</option><option>America/New_York</option></select>
            </Row>
            <Row label="Global tax rate" desc="Override per store in their own settings.">
              <input aria-label="Global tax rate" defaultValue="5.4%" style={{ ...inputStyle, width: 90, textAlign: 'right' }} onChange={() => setDirty(true)} />
            </Row>
          </div>
        </Card>

        <Card>
          <Head title="Security policy" />
          <div style={{ padding: '4px 18px 12px' }}>
            <Row label="Enforce two-factor auth" desc="Require 2FA for all owners and admins.">
              <Switch checked={toggles.enforce2fa} onChange={(v) => set('enforce2fa', v)} label="Enforce 2FA" />
            </Row>
            <Row label="Strong password policy" desc="Min 8 chars, mixed case, number & symbol.">
              <Switch checked={toggles.passwordPolicy} onChange={(v) => set('passwordPolicy', v)} label="Password policy" />
            </Row>
            <Row label="Auto-suspend on failed payment" desc="Suspend store after 3 failed charges.">
              <Switch checked={toggles.autoSuspend} onChange={(v) => set('autoSuspend', v)} label="Auto-suspend" />
            </Row>
          </div>
        </Card>

        <Card>
          <Head title="Branding" />
          <div style={{ padding: '4px 18px 12px' }}>
            <Row label="Platform name" desc="Shown across the app and emails.">
              <input aria-label="Platform name" defaultValue="StoreFlow" style={inputStyle} onChange={() => setDirty(true)} />
            </Row>
            <Row label="Accent color" desc="Primary brand color.">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 22, height: 22, borderRadius: 6, background: '#2563EB', border: '1px solid var(--line)' }} /><span className="mono" style={{ color: 'var(--ink-soft)' }}>#2563EB</span></span>
            </Row>
            <Row label="Maintenance mode" desc="Temporarily disable tenant logins.">
              <Switch checked={toggles.maintenance} onChange={(v) => set('maintenance', v)} label="Maintenance mode" />
            </Row>
          </div>
        </Card>

        <Card>
          <Head title="Email templates" />
          <div style={{ padding: '4px 18px 12px' }}>
            {['Welcome / store approved', 'Password reset', 'Security alert'].map((t) => (
              <Row key={t} label={t} desc="">
                <Button variant="ghost" size="sm" onClick={() => toast('Opening template editor…')}>Edit</Button>
              </Row>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Head({ title }: { title: string }) {
  return <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>{title}</h3></div>;
}
function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '15px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div>
        <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2, maxWidth: 320, lineHeight: 1.45 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}
