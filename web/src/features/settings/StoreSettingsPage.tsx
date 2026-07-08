import { useState, useRef } from 'react';
import { Button, toast } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function StoreSettingsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [dirty, setDirty] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mark = () => setDirty(true);
  const save = () => { setDirty(false); toast('Store settings saved'); };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please select an image file');
    if (f.size > 2 * 1024 * 1024) return toast('File must be under 2 MB');
    const reader = new FileReader();
    reader.onload = () => { setLogoPreview(reader.result as string); setDirty(true); };
    reader.readAsDataURL(f);
  };

  const stlInp: React.CSSProperties = {
    width: '100%',
    padding: isMobile ? '12px 14px' : '11px 13px',
    border: '1px solid var(--line)',
    borderRadius: 11,
    fontFamily: 'inherit',
    fontSize: isMobile ? 16 : 14,
    color: 'var(--ink)',
    background: 'var(--paper)',
    boxSizing: 'border-box',
  };

  const stlSel: React.CSSProperties = { ...stlInp, cursor: 'pointer' };

  const Field = ({ label, desc, children: input }: { label: string; desc?: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: isMobile ? 14 : 16 }}>
      <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>{label}</label>
      {desc && <div style={{ fontSize: isMobile ? 11.5 : 11.5, color: 'var(--ink-faint)', marginBottom: 7, lineHeight: 1.4 }}>{desc}</div>}
      {input}
    </div>
  );

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Store settings</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>Configure your store identity, defaults and alerts.</p>
        </div>
        <Button onClick={save} disabled={!dirty} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>{dirty ? 'Save changes' : 'Saved'}</Button>
      </div>

      <style>{`
        .sf-set-card { transition: box-shadow .2s, transform .2s; }
        .sf-set-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .sf-set-card { transition: none; }
          .sf-set-card:hover { transform: none; }
        }
      `}</style>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 14 : 18 }}>
        {/* General info */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            General
          </div>
          <Field label="Store name"><input defaultValue="Blue Palm Grocers" placeholder="Store name" onChange={mark} style={stlInp} /></Field>
          <Field label="Phone"><input defaultValue="+1 555-0123" placeholder="Phone number" onChange={mark} style={stlInp} /></Field>
          <Field label="Email"><input defaultValue="contact@bluepalm-grocers.com" placeholder="Store email" onChange={mark} style={stlInp} /></Field>
          <Field label="Address"><input defaultValue="221 Harbor St, Marseille" placeholder="Street, city, postal code" onChange={mark} style={stlInp} /></Field>
          <Field label="Business type"><input defaultValue="Grocery" placeholder="e.g. Grocery, Pharmacy, Retail" onChange={mark} style={stlInp} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 0 : 14 }}>
            <Field label="Currency">
              <select aria-label="Currency" defaultValue="USD — $" onChange={mark} style={stlSel}>
                <option>USD — $</option><option>EUR — €</option><option>EGP — E£</option>
              </select>
            </Field>
            <Field label="Tax rate (%)">
              <input defaultValue="5.4" onChange={mark} style={stlInp} />
            </Field>
          </div>
        </div>

        {/* Logo + Branding */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            Branding
          </div>
          <Field label="Store logo" desc="PNG or JPG, max 2 MB. Square recommended.">
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
              <div style={{ width: isMobile ? 60 : 64, height: isMobile ? 60 : 64, borderRadius: 12, border: '1px solid var(--line-soft)', background: 'var(--paper)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                )}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ padding: isMobile ? '10px 16px' : '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >Choose file</button>
                {logoPreview && <button type="button" onClick={() => { setLogoPreview(null); setDirty(true); }} style={{ display: 'block', marginTop: 6, padding: 0, border: 'none', background: 'transparent', fontSize: isMobile ? 12 : 11.5, fontWeight: 600, cursor: 'pointer', color: 'var(--red)', fontFamily: 'inherit' }}>Remove</button>}
              </div>
            </div>
          </Field>
          <Field label="Accent color">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" defaultValue="#2563EB" onChange={mark} style={{ width: 40, height: 40, padding: 2, border: '1px solid var(--line)', borderRadius: 8, cursor: 'pointer', background: 'transparent' }} />
              <span className="mono" style={{ fontSize: isMobile ? 13 : 13, color: 'var(--ink-soft)' }}>#2563EB</span>
            </div>
          </Field>
        </div>

        {/* Low-stock thresholds */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            Low-stock thresholds
          </div>
          <Field label="Default reorder threshold (units)" desc="Products at or below this level are flagged low-stock.">
            <input defaultValue="10" onChange={mark} style={stlInp} />
          </Field>
          <Field label="Critical stock level (units)" desc="Products at or below this trigger urgent alerts.">
            <input defaultValue="3" onChange={mark} style={stlInp} />
          </Field>
          <Field label="Alert recipients" desc="Comma-separated email addresses for low-stock notifications.">
            <input defaultValue="owner@bluepalm-grocers.com, d.okafor@bluepalm-grocers.com" placeholder="email1@store.com, email2@store.com" onChange={mark} style={stlInp} />
          </Field>
          <div style={{ marginTop: isMobile ? 6 : 8, display: 'flex', gap: 4 }}>
            {[
              { level: 'In stock', color: 'var(--green)', range: '> 10' },
              { level: 'Low', color: 'var(--amber)', range: '4 – 10' },
              { level: 'Critical', color: 'var(--red)', range: '≤ 3' },
            ].map((t) => (
              <div key={t.level} style={{ flex: 1, textAlign: 'center', padding: isMobile ? '6px 4px' : '6px 8px', borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--line-soft)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, margin: '0 auto 3px' }} />
                <div style={{ fontSize: isMobile ? 10 : 10, fontWeight: 700, color: t.color }}>{t.level}</div>
                <div style={{ fontSize: isMobile ? 9.5 : 9.5, color: 'var(--ink-faint)' }}>{t.range}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert notifications */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            Notification preferences
          </div>
          <Field label="Low-stock alerts">
            <select aria-label="Low-stock alerts" defaultValue="email" onChange={mark} style={stlSel}>
              <option value="email">Email only</option>
              <option value="push">Push only</option>
              <option value="both">Email + push</option>
              <option value="off">Disabled</option>
            </select>
          </Field>
          <Field label="Daily sales summary">
            <select aria-label="Daily sales summary" defaultValue="email" onChange={mark} style={stlSel}>
              <option value="email">Email</option>
              <option value="off">Disabled</option>
            </select>
          </Field>
          <Field label="Weekly report digest">
            <select aria-label="Weekly report digest" defaultValue="email" onChange={mark} style={stlSel}>
              <option value="email">Email (Monday)</option>
              <option value="off">Disabled</option>
            </select>
          </Field>
          <Field label="Security alerts" desc="Login from new device, password changes, etc.">
            <select aria-label="Security alerts" defaultValue="both" onChange={mark} style={stlSel}>
              <option value="email">Email only</option>
              <option value="both">Email + push</option>
            </select>
          </Field>
        </div>
      </div>
    </>
  );
}
