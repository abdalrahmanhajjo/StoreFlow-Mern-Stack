import { useState, useRef, useEffect } from 'react';
import { Button, toast } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSession } from '@/store/session';
import { useStoreConfig } from '@/config/StoreProfileContext';
import {
  isConnected,
  apiGetStoreSettings,
  apiUpdateStoreSettings,
  apiUpdateMyStore,
  type StoreSettings,
} from '@/lib/api/resources';
import { useStoreIdentity } from '@/lib/api/storeIdentity';
import { errorMessage } from '@/lib/http/errors';
import DangerZoneCard from './DangerZoneCard';

const EMPTY: StoreSettings = {
  storeName: '', phone: '', email: '', address: '', currency: 'USD',
  taxRate: 0, logoUrl: '', lowStockThreshold: 10, invoicePrefix: 'INV', receiptFooter: '',
};

/** Stable module-level field wrapper — defining this inside the page would
 * mint a new component type on every keystroke, remounting the input and
 * dropping focus after each character. */
function Field({ label, desc, isMobile, children: input }: { label: string; desc?: string; isMobile: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: isMobile ? 14 : 16 }}>
      <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>{label}</label>
      {desc && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 7, lineHeight: 1.4 }}>{desc}</div>}
      {input}
    </div>
  );
}

export default function StoreSettingsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const user = useSession((s) => s.user);
  const config = useStoreConfig();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<StoreSettings>(EMPTY);
  const fileRef = useRef<HTMLInputElement>(null);

  // Connected mode loads the real per-store settings; demo mode seeds the
  // form from the active store template so the page stays usable.
  useEffect(() => {
    if (!isConnected) {
      setForm((f) => ({ ...f, storeName: config.profile.name, currency: config.profile.currency }));
      return;
    }
    apiGetStoreSettings()
      .then((s) => setForm(s))
      .catch((e) => toast.error(errorMessage(e, 'Could not load store settings from the server')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const edit = <K extends keyof StoreSettings>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = e.target.value;
      setForm((f) => ({
        ...f,
        [key]: key === 'taxRate' || key === 'lowStockThreshold' ? Number(raw) || 0 : raw,
      }));
      setDirty(true);
    };

  const save = async () => {
    if (!isConnected) {
      setDirty(false);
      toast('Store settings saved');
      return;
    }
    setBusy(true);
    try {
      await apiUpdateStoreSettings(form);
      // Keep the store document (shell identity, receipts, admin list) in sync.
      if (user?.storeId) {
        await apiUpdateMyStore(user.storeId, {
          storeName: form.storeName,
          currency: form.currency,
          taxRate: form.taxRate,
          address: form.address,
        });
        await useStoreIdentity.getState().refresh();
      }
      setDirty(false);
      toast('Store settings saved');
    } catch (err) {
      toast.error((err as Error)?.message || 'Could not save settings to the server');
    } finally {
      setBusy(false);
    }
  };

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please select an image file');
    if (f.size > 2 * 1024 * 1024) return toast('File must be under 2 MB');
    const reader = new FileReader();
    reader.onload = () => { setForm((s) => ({ ...s, logoUrl: reader.result as string })); setDirty(true); };
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

  const low = form.lowStockThreshold;

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Store settings</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>Configure your store identity, defaults and alerts.</p>
        </div>
        <Button onClick={save} disabled={!dirty || busy} isLoading={busy} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>{dirty ? 'Save changes' : 'Saved'}</Button>
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
          <Field isMobile={isMobile} label="Store name"><input value={form.storeName} placeholder="Store name" onChange={edit('storeName')} style={stlInp} /></Field>
          <Field isMobile={isMobile} label="Phone"><input value={form.phone} placeholder="Phone number" onChange={edit('phone')} style={stlInp} /></Field>
          <Field isMobile={isMobile} label="Email"><input value={form.email} placeholder="Store email" onChange={edit('email')} style={stlInp} /></Field>
          <Field isMobile={isMobile} label="Address"><input value={form.address} placeholder="Street, city, postal code" onChange={edit('address')} style={stlInp} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 0 : 14 }}>
            <Field isMobile={isMobile} label="Currency">
              <select aria-label="Currency" value={form.currency} onChange={edit('currency')} style={stlSel}>
                <option value="USD">USD — $</option><option value="EUR">EUR — €</option><option value="EGP">EGP — E£</option>
              </select>
            </Field>
            <Field isMobile={isMobile} label="Tax rate (%)">
              <input type="number" min={0} step={0.1} value={form.taxRate} onChange={edit('taxRate')} style={stlInp} />
            </Field>
          </div>
        </div>

        {/* Branding + receipts */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            Branding & receipts
          </div>
          <Field isMobile={isMobile} label="Store logo" desc="PNG or JPG, max 2 MB. Square recommended.">
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 12 }}>
              <div style={{ width: isMobile ? 60 : 64, height: isMobile ? 60 : 64, borderRadius: 12, border: '1px solid var(--line-soft)', background: 'var(--paper)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                {form.logoUrl && <button type="button" onClick={() => { setForm((s) => ({ ...s, logoUrl: '' })); setDirty(true); }} style={{ display: 'block', marginTop: 6, padding: 0, border: 'none', background: 'transparent', fontSize: isMobile ? 12 : 11.5, fontWeight: 600, cursor: 'pointer', color: 'var(--red)', fontFamily: 'inherit' }}>Remove</button>}
              </div>
            </div>
          </Field>
          <Field isMobile={isMobile} label="Invoice prefix" desc="Printed before invoice numbers, e.g. INV-20260711-0042.">
            <input value={form.invoicePrefix} onChange={edit('invoicePrefix')} style={stlInp} />
          </Field>
          <Field isMobile={isMobile} label="Receipt footer" desc="Shown at the bottom of every printed receipt.">
            <input value={form.receiptFooter} placeholder="Thank you for shopping with us!" onChange={edit('receiptFooter')} style={stlInp} />
          </Field>
        </div>

        {/* Low-stock thresholds */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            Low-stock thresholds
          </div>
          <Field isMobile={isMobile} label="Default low-stock threshold (units)" desc="Products at or below this level are flagged low-stock on the dashboard.">
            <input type="number" min={0} value={form.lowStockThreshold} onChange={edit('lowStockThreshold')} style={stlInp} />
          </Field>
          <div style={{ marginTop: isMobile ? 6 : 8, display: 'flex', gap: 4 }}>
            {[
              { level: 'In stock', color: 'var(--green)', range: `> ${low}` },
              { level: 'Low', color: 'var(--amber)', range: `1 – ${low}` },
              { level: 'Out', color: 'var(--red)', range: '0' },
            ].map((t) => (
              <div key={t.level} style={{ flex: 1, textAlign: 'center', padding: isMobile ? '6px 4px' : '6px 8px', borderRadius: 6, background: 'var(--paper)', border: '1px solid var(--line-soft)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, margin: '0 auto 3px' }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: t.color }}>{t.level}</div>
                <div style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>{t.range}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Account & security */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            Account
          </div>
          <Field isMobile={isMobile} label="Signed in as">
            <input value={`${user?.name ?? ''} · ${user?.email ?? ''}`} readOnly style={{ ...stlInp, color: 'var(--ink-soft)', cursor: 'default' }} />
          </Field>
          <Field isMobile={isMobile} label="Role">
            <input value={user?.role ?? ''} readOnly style={{ ...stlInp, color: 'var(--ink-soft)', cursor: 'default' }} />
          </Field>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.5, margin: '4px 0 0' }}>
            To change your password, sign out and use "Forgot password" — a reset code
            is emailed to you. Staff accounts are managed on the Employees page.
          </p>
        </div>

        {/* Plan & billing */}
        <div className="sf-set-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 16 : 20 }}>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: isMobile ? 14 : 16, paddingBottom: isMobile ? 10 : 12, borderBottom: '1px solid var(--line)' }}>
            Plan &amp; billing
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 14px' }}>
            View your current plan, compare features and limits, and upgrade or
            downgrade your subscription.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <a href="/settings/billing"
              style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--ink)', color: 'var(--card)', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}
            >
              Manage billing
            </a>
          </div>
        </div>

        {/* Danger zone — permanent account/store deletion */}
        <DangerZoneCard isMobile={isMobile} />
      </div>
    </>
  );
}
