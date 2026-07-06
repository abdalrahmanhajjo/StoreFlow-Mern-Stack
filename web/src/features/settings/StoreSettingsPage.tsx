import { useState } from 'react';
import { Card, Input, Button, toast } from '@/components/ui';

// SF-1301: store identity & config (client-only draft; owner-only route).
export default function StoreSettingsPage() {
  const [dirty, setDirty] = useState(false);
  const mark = () => setDirty(true);
  const save = () => { setDirty(false); toast('Store settings saved'); };

  const selStyle: React.CSSProperties = { width: '100%', padding: '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, background: 'var(--card)', color: 'var(--ink)', marginBottom: 16 };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Store settings</h2>
        </div>
        <Button onClick={save} disabled={!dirty}>{dirty ? 'Save changes' : 'Saved'}</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 12 }}>General</div>
          <Input label="Store name" defaultValue="Blue Palm Grocers" onChange={mark} />
          <Input label="Address" defaultValue="221 Harbor St, Marseille" onChange={mark} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Currency</label>
              <select aria-label="Currency" style={selStyle} onChange={mark}><option>USD — $</option><option>EUR — €</option><option>EGP — E£</option></select>
            </div>
            <Input label="Tax rate (%)" defaultValue="5.4" onChange={mark} />
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 12 }}>Low-stock alerts</div>
          <p style={{ color: 'var(--ink-soft)', margin: '0 0 12px', fontSize: 13 }}>Default reorder point applied to new products.</p>
          <Input label="Default reorder threshold (units)" defaultValue="10" onChange={mark} />
          <Input label="Alert recipients" defaultValue="owner@bluepalm-grocers.com, d.okafor@bluepalm-grocers.com" onChange={mark} />
        </Card>
      </div>
    </>
  );
}
