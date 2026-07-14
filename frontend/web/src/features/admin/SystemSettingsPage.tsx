import { useState, useEffect } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, Input, Modal, confirmDialog, toast } from '@/components/ui';
import { useEmailTemplates } from './emailTemplatesStore';
import type { EmailTemplate, EmailTemplateInput } from './emailTemplateService';

interface Toggles {
  enforce2fa: boolean;
  passwordPolicy: boolean;
  autoSuspend: boolean;
  maintenance: boolean;
}

/** Module-level so re-renders never remount it (keyboard focus survives). */
function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0, position: 'relative', background: checked ? 'var(--green)' : 'var(--line)', transition: 'background .15s', flexShrink: 0 }}
    >
      <span style={{ display: 'block', width: 20, height: 20, borderRadius: '50%', background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,.15)', transition: 'transform .15s', transform: checked ? 'translateX(20px)' : 'translateX(2px)' }} />
    </button>
  );
}

const EMPTY_DRAFT: EmailTemplateInput = {
  name: '', subject: '', html: '', text: '', description: '', variables: [], isActive: true,
};

function toDraft(t: EmailTemplate): EmailTemplateInput {
  return {
    name: t.name, subject: t.subject, html: t.html, text: t.text ?? '',
    description: t.description ?? '', variables: t.variables, isActive: t.isActive,
  };
}

export default function SystemSettingsPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [toggles, setToggles] = useState<Toggles>({ enforce2fa: false, passwordPolicy: true, autoSuspend: true, maintenance: false });
  const [dirty, setDirty] = useState(false);

  const { templates, loaded, load, createTemplate, updateTemplate, deleteTemplate } = useEmailTemplates();
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const [editingId, setEditingId] = useState<string | null>(null); // null = closed, 'new' = create mode
  const [draft, setDraft] = useState<EmailTemplateInput>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const toggle = (k: keyof Toggles) => {
    setToggles((t) => ({ ...t, [k]: !t[k] }));
    setDirty(true);
  };

  const save = () => { setDirty(false); toast('System settings saved'); };

  const openEdit = (t: EmailTemplate) => { setEditingId(t._id); setDraft(toDraft(t)); };
  const openNew = () => { setEditingId('new'); setDraft(EMPTY_DRAFT); };
  const closeModal = () => { setEditingId(null); setDraft(EMPTY_DRAFT); };

  const saveTemplate = async () => {
    if (draft.name.trim().length < 2) return toast('Enter a template name');
    if (draft.subject.trim().length < 2) return toast('Enter a subject line');
    if (draft.html.trim().length < 1) return toast('Enter the HTML body');

    setSaving(true);
    const res = editingId === 'new'
      ? await createTemplate(draft)
      : await updateTemplate(editingId as string, draft);
    setSaving(false);

    if (!res.ok) return toast(res.error ?? 'Could not save template');
    toast(editingId === 'new' ? 'Template created' : 'Template updated');
    closeModal();
  };

  const onDelete = async (t: EmailTemplate) => {
    if (t.isSystem) return; // button is already disabled for these, this is just a safety net
    if (!(await confirmDialog(`Delete the "${t.name}" template? This cannot be undone.`))) return;
    const res = await deleteTemplate(t._id);
    if (!res.ok) return toast(res.error ?? 'Could not delete template');
    toast(`${t.name} deleted`);
  };

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

  const stlTextarea: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid var(--line)',
    borderRadius: 9,
    fontFamily: 'monospace',
    fontSize: 12.5,
    color: 'var(--ink)',
    background: 'var(--paper)',
    boxSizing: 'border-box',
    resize: 'vertical',
  };

  const stlLabel: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '0 0 6px',
  };

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
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Email templates</h3>
            <Button variant="ghost" size="sm" onClick={openNew}>+ Add template</Button>
          </div>
          <div style={{ padding: isMobile ? '4px 14px 12px' : '4px 18px 12px' }}>
            {!loaded ? (
              <p style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-faint)' }}>Loading templates…</p>
            ) : templates.length === 0 ? (
              <p style={{ padding: '16px 0', fontSize: 13, color: 'var(--ink-faint)' }}>No templates yet — add one to get started.</p>
            ) : (
              templates.map((t) => (
                <Row key={t._id} label={t.name} desc={t.description || t.slug} isMobile={isMobile}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {!t.isActive && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Inactive</span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                    <button type="button" onClick={() => onDelete(t)} disabled={t.isSystem}
                      title={t.isSystem ? 'System templates cannot be deleted' : 'Delete template'}
                      style={{ background: 'none', border: 'none', padding: 4, cursor: t.isSystem ? 'not-allowed' : 'pointer', color: t.isSystem ? 'var(--ink-faint)' : 'var(--red)', opacity: t.isSystem ? 0.4 : 1 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </Row>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Email template editor */}
      <Modal open={editingId !== null} onClose={closeModal} title={editingId === 'new' ? 'New email template' : 'Edit email template'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: isMobile ? undefined : 480 }}>
          <div>
            <label style={stlLabel}>Name</label>
            <Input aria-label="Template name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>

          <div>
            <label style={stlLabel}>Description</label>
            <Input aria-label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>

          <div>
            <label style={stlLabel}>Subject</label>
            <Input aria-label="Subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Use {{variables}} like {{code}} or {{name}}" />
          </div>

          <div>
            <label style={stlLabel}>HTML body</label>
            <textarea aria-label="HTML body" rows={8} value={draft.html} onChange={(e) => setDraft({ ...draft, html: e.target.value })} style={stlTextarea} />
          </div>

          <div>
            <label style={stlLabel}>Plain-text fallback (optional)</label>
            <textarea aria-label="Plain text body" rows={4} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} style={stlTextarea} />
          </div>

          <div>
            <label style={stlLabel}>Variables (comma-separated — documents which {'{{placeholders}}'} this template expects)</label>
            <Input aria-label="Variables" value={draft.variables.join(', ')}
              onChange={(e) => setDraft({ ...draft, variables: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })}
              placeholder="code, name, storeName" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Active</span>
            <Switch checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Button onClick={saveTemplate} isLoading={saving} style={{ flex: 1, justifyContent: 'center' }}>Save</Button>
            <Button variant="ghost" onClick={closeModal} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Button>
          </div>
        </div>
      </Modal>
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