import { useState, useMemo, useRef } from 'react';
import { useCategories } from './categoriesStore';
import { useProducts } from '@/features/products/productsStore';
import { useSession } from '@/store/session';
import { can } from '@/lib/rbac';
import { Modal, Button, Input, confirm, toast } from '@/components/ui';

interface Row { id: string; name: string; emoji: string; image: string; description: string; count: number }

const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Beverages', items: ['🥤', '🧃', '☕', '🍵', '🧉', '🥛', '🍺', '🍷', '🧊'] },
  { label: 'Bakery & Dairy', items: ['🍞', '🥐', '🥨', '🥖', '🧀', '🥚', '🧈', '🥞', '🧁', '🍰'] },
  { label: 'Produce & Meat', items: ['🍎', '🍌', '🍇', '🍊', '🍋', '🍅', '🥑', '🥕', '🌽', '🥩', '🍗', '🐟', '🥒', '🌶️'] },
  { label: 'Pantry & Meals', items: ['🍚', '🍝', '🥫', '🧂', '🍯', '🥜', '🍜', '🍟', '🌮', '🥗', '🍕', '🍳'] },
  { label: 'Snacks & Sweets', items: ['🍫', '🍪', '🍩', '🍿', '🍭', '🍦'] },
  { label: 'Household', items: ['🧴', '🧻', '🧹', '🧽', '🧺', '🧼', '🪣', '🧯', '🔦'] },
  { label: 'Pharmacy & Health', items: ['💊', '💉', '🌡️', '🩹', '🩺', '🧬', '🦠', '🩻', '👁️', '🦷', '🧴'] },
  { label: 'Electronics', items: ['💻', '📱', '⌚', '📷', '🔌', '🔋', '🎧', '🖥️', '🎮', '📡', '🖨️'] },
  { label: 'Clothing & Accessories', items: ['👕', '👗', '👖', '🧥', '👟', '👛', '👜', '🧢', '👔', '🧣', '⌚'] },
  { label: 'General', items: ['📦', '🧾', '🏷️', '📋', '🔗', '⚙️', '🔧', '🛒', '🗂️'] },
];

export default function CategoriesPage() {
  const role = useSession((s) => s.user?.role ?? null);
  const writable = role ? can(role, 'product.write') : false;
  const { categories, create, update, remove } = useCategories();
  const products = useProducts((s) => s.products);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [image, setImage] = useState('');
  const [desc, setDesc] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const rows: Row[] = useMemo(
    () => categories.map((c) => ({
      id: c.id, name: c.name, emoji: c.emoji, image: c.image, description: c.description,
      count: products.filter((p) => p.category === c.name).length,
    })),
    [categories, products]
  );

  const editing = editingId ? rows.find((r) => r.id === editingId) : null;

  const openNew = () => {
    setEditingId(null);
    setName('');
    setEmoji('');
    setImage('');
    setDesc('');
    setFormOpen(true);
  };

  const openEdit = (r: Row) => {
    setEditingId(r.id);
    setName(r.name);
    setEmoji(r.emoji);
    setImage(r.image ?? '');
    setDesc(r.description ?? '');
    setFormOpen(true);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast('Please select an image file');
    if (f.size > 2 * 1024 * 1024) return toast('Image must be under 2 MB');
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(f);
  };

  const onSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return toast('Enter a category name');
    if (editingId) {
      const res = update(editingId, { name: trimmed, emoji, image, description: desc });
      if (!res.ok) return toast(res.error ?? 'Could not update');
      toast('Category updated');
    } else {
      const res = create({ name: trimmed, emoji, image, description: desc });
      if (!res.ok) return toast(res.error ?? 'Could not create');
      toast(`Category “${trimmed}” added`);
    }
    setFormOpen(false);
  };

  const onDelete = async (r: Row) => {
    if (r.count > 0) {
      return toast(`Cannot delete — ${r.count} product(s) still use “${r.name}”`);
    }
    if (await confirm({ title: `Delete category “${r.name}”?`, confirmLabel: 'Delete', danger: true })) {
      remove(r.id);
      toast(`“${r.name}” deleted`);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Catalog</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Categories</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>{categories.length} categories · {products.length} products</p>
        </div>
        {writable && <Button onClick={openNew}>+ Add category</Button>}
      </div>

      <style>{`
        .sf-cat-card { transition: box-shadow .2s, transform .2s; }
        .sf-cat-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-cat-card-actions { opacity: 0; transition: opacity .15s; }
        .sf-cat-card:hover .sf-cat-card-actions,
        .sf-cat-card:focus-within .sf-cat-card-actions { opacity: 1; }
        @media (hover: none) { .sf-cat-card-actions { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sf-cat-card, .sf-cat-card-actions { transition: none; }
          .sf-cat-card:hover { transform: none; }
        }
      `}</style>

      {rows.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No categories yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>Create your first category to organise products.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {rows.map((r) => (
              <div key={r.id} className="sf-cat-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                <div style={{ padding: 16, paddingBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    {r.image ? (
                      <img src={r.image} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--line-soft)' }} />
                    ) : (
                      <span style={{ fontSize: 28, lineHeight: 1 }}>{r.emoji || '📦'}</span>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 9px', borderRadius: 6, background: r.count > 0 ? 'var(--blue-soft)' : 'var(--paper)', color: r.count > 0 ? 'var(--blue-deep)' : 'var(--ink-faint)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {r.count} product{r.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{r.name}</div>
                  {r.description && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{r.description}</div>
                  )}
                </div>
                <div className="sf-cat-card-actions" style={{ display: 'flex', gap: 2, borderTop: '1px solid var(--line-soft)', background: 'var(--paper)', padding: '6px 8px', marginTop: 8 }}>
                  <button type="button" onClick={() => openEdit(r)} style={{ flex: 1, padding: '6px 0', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    Edit
                  </button>
                  <button type="button" onClick={() => onDelete(r)} disabled={!writable || r.count > 0} style={{ flex: 1, padding: '6px 0', fontSize: 11.5, fontWeight: 600, background: 'transparent', border: 'none', borderRadius: 6, cursor: writable && r.count === 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: writable && r.count === 0 ? 'var(--red)' : 'var(--ink-faint)', opacity: writable && r.count === 0 ? 1 : 0.5 }}
                    onMouseEnter={(e) => { if (writable && r.count === 0) e.currentTarget.style.background = 'var(--red-soft)'; }}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    {r.count > 0 ? `${r.count} in use` : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {writable && (
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit “${editing.name}”` : 'New category'}>
          <div style={{ marginBottom: 16 }}>
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frozen Foods" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Emoji <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span></label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 28, width: 40, textAlign: 'center', lineHeight: 1 }}>{emoji || '📦'}</span>
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="📦" maxLength={4} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)', background: 'var(--paper)' }} />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '6px 4px', background: 'var(--paper)', borderRadius: 11, border: '1px solid var(--line-soft)', scrollbarWidth: 'thin' }}>
              <style>{`.sf-cat-scroll::-webkit-scrollbar { width: 4px; } .sf-cat-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }`}</style>
              <div className="sf-cat-scroll">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-faint)', padding: '4px 6px 6px', marginBottom: 2 }}>{group.label}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 4px' }}>
                      {group.items.map((e) => (
                        <button key={e} type="button" onClick={() => setEmoji(e)} aria-label={`Use emoji ${e}`}
                          style={{ width: 34, height: 34, fontSize: 17, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: emoji === e ? 'var(--blue-soft)' : 'transparent', boxShadow: emoji === e ? '0 0 0 2px var(--blue)' : 'none', transition: 'background .1s' }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <Input label="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Chilled & frozen goods" />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Image (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, border: '1px solid var(--line-soft)', background: 'var(--paper)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 26 }}>
                {image ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (emoji || '📦')}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}>
                  Choose image
                </button>
                {image && <button type="button" onClick={() => setImage('')} style={{ display: 'block', marginTop: 6, padding: 0, border: 'none', background: 'transparent', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', color: 'var(--red)', fontFamily: 'inherit' }}>Remove</button>}
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '7px 0 0', lineHeight: 1.4 }}>PNG or JPG, max 2 MB. Falls back to the emoji when empty.</p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setFormOpen(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button onClick={onSave} style={{ flex: 2 }}>{editing ? 'Save changes' : 'Create category'}</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
