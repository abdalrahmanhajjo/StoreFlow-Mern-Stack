import { useState, useMemo } from 'react';
import { useSupply, supplierProductCount, supplierLinkedProducts } from './supplyStore';
import { useProducts } from '@/features/products/productsStore';
import { Modal, Button, Input, toast, confirm } from '@/components/ui';

export default function SuppliersPage() {
  const { suppliers, purchaseOrders, addSupplier, updateSupplier, removeSupplier } = useSupply();
  const products = useProducts((s) => s.products);
  const updateProduct = useProducts((s) => s.update);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [linkQuery, setLinkQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const editing = editingId ? suppliers.find((s) => s.id === editingId) ?? null : null;

  const openNew = () => {
    setEditingId(null);
    setName(''); setPhone(''); setEmail(''); setAddress(''); setLinkQuery(''); setSaving(false);
    setFormOpen(true);
  };

  const openEdit = (s: typeof suppliers[number]) => {
    setEditingId(s.id);
    setName(s.name); setPhone(s.phone); setEmail(s.email); setAddress(s.address); setLinkQuery(''); setSaving(false);
    setFormOpen(true);
  };

  const onSave = () => {
    if (saving) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) return toast('Enter a supplier name');
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      return toast('Enter a valid email address');
    }
    setSaving(true);
    const input = { name: trimmed, phone, email, address };
    if (editingId) {
      const res = updateSupplier(editingId, input);
      if (!res.ok) { setSaving(false); return toast(res.error ?? 'Could not update'); }
      toast('Supplier updated');
    } else {
      const res = addSupplier(input);
      if (!res.ok) { setSaving(false); return toast(res.error ?? 'Could not add'); }
      toast(`“${trimmed}” added`);
    }
    setFormOpen(false);
  };

  const onDelete = async (s: typeof suppliers[number]) => {
    if (supplierProductCount(s.id) > 0) {
      return toast(`Cannot delete — ${supplierProductCount(s.id)} product(s) are linked to “${s.name}”`);
    }
    if (await confirm({ title: `Remove supplier “${s.name}”?`, confirmLabel: 'Remove', danger: true })) {
      removeSupplier(s.id);
      toast(`“${s.name}” removed`);
    }
  };

  const linked = editingId ? supplierLinkedProducts(editingId) : [];

  const unlinkable = useMemo(() => {
    const q = linkQuery.trim().toLowerCase();
    return products.filter((p) => !p.supplierId || p.supplierId === editingId).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.sku.includes(q)
    );
  }, [products, editingId, linkQuery]);

  const linkProduct = (productId: string) => {
    if (!editingId) return;
    updateProduct(productId, { supplierId: editingId });
  };

  const unlinkProduct = (productId: string) => {
    updateProduct(productId, { supplierId: undefined });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Relationships</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Suppliers</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>{suppliers.length} suppliers</p>
        </div>
        <Button onClick={openNew}>+ Add supplier</Button>
      </div>

      <style>{`
        .sf-sup-card { transition: box-shadow .2s, transform .2s; }
        .sf-sup-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-sup-card-actions { opacity: 0; transition: opacity .15s; }
        .sf-sup-card:hover .sf-sup-card-actions,
        .sf-sup-card:focus-within .sf-sup-card-actions { opacity: 1; }
        @media (hover: none) { .sf-sup-card-actions { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sf-sup-card, .sf-sup-card-actions { transition: none; }
          .sf-sup-card:hover { transform: none; }
        }
      `}</style>

      {suppliers.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>No suppliers yet</p>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>Add your first supplier to start managing purchases.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {suppliers.map((s) => {
              const count = supplierProductCount(s.id);
              const openOrders = purchaseOrders.filter((o) => o.supplier === s.name && o.status === 'pending').length;
              const initial = s.name.charAt(0).toUpperCase();
              return (
                <div key={s.id} className="sf-sup-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                  <div style={{ padding: 16, paddingBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'var(--blue-deep)', flexShrink: 0 }}>{initial}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                          {s.phone}{s.email ? ` · ${s.email}` : ''}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 9px', borderRadius: 6, background: count > 0 ? 'var(--blue-soft)' : 'var(--paper)', color: count > 0 ? 'var(--blue-deep)' : 'var(--ink-faint)', fontVariantNumeric: 'tabular-nums' }}>
                        {count} product{count !== 1 ? 's' : ''}
                      </span>
                      {openOrders > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 9px', borderRadius: 6, background: 'var(--amber-soft)', color: 'var(--amber)' }}>
                          {openOrders} PO open
                        </span>
                      )}
                    </div>
                    {s.address && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address}</div>}
                  </div>
                  <div className="sf-sup-card-actions" style={{ display: 'flex', gap: 2, borderTop: '1px solid var(--line-soft)', background: 'var(--paper)', padding: '6px 8px', marginTop: 8 }}>
                    <button type="button" onClick={() => openEdit(s)} style={{ flex: 1, padding: '6px 0', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(s)} disabled={count > 0} style={{ flex: 1, padding: '6px 0', fontSize: 11.5, fontWeight: 600, background: 'transparent', border: 'none', borderRadius: 6, cursor: count === 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: count === 0 ? 'var(--red)' : 'var(--ink-faint)', opacity: count === 0 ? 1 : 0.5 }}
                      onMouseEnter={(e) => { if (count === 0) e.currentTarget.style.background = 'var(--red-soft)'; }}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      {count > 0 ? `${count} linked` : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit “${editing.name}”` : 'Add supplier'}>
        <div style={{ marginBottom: 14 }}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Wholesale" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@acme.com" />
        </div>
        <div style={{ marginBottom: editing ? 18 : 14 }}>
          <Input label="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />
        </div>

        {/* Linked products (edit mode only) */}
        {editing && (
          <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
              Linked products <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>({linked.length})</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 10 }}>Search and click to link or unlink products.</div>

            <input value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} placeholder="Search products…" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--paper)', marginBottom: 10 }} />

            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--line-soft)', borderRadius: 9, scrollbarWidth: 'thin' }}>
              {unlinkable.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12.5 }}>No products match.</div>
              ) : (
                unlinkable.slice(0, 20).map((p) => {
                  const isLinked = p.supplierId === editingId;
                  return (
                    <div key={p.id} onClick={() => isLinked ? unlinkProduct(p.id) : linkProduct(p.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') (isLinked ? unlinkProduct(p.id) : linkProduct(p.id)); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12.5, background: isLinked ? 'var(--blue-soft)' : 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isLinked ? 'var(--blue-soft)' : 'var(--paper)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = isLinked ? 'var(--blue-soft)' : 'transparent'}
                    >
                      <span style={{ fontSize: 16 }}>{p.emoji}</span>
                      <span style={{ flex: 1, color: 'var(--ink)' }}>{p.name}</span>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{p.sku}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: isLinked ? 'var(--blue-deep)' : 'var(--ink-faint)', flexShrink: 0 }}>
                        {isLinked ? 'Linked ✕' : '+ Link'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <Button variant="ghost" onClick={() => setFormOpen(false)} style={{ flex: 1 }} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} style={{ flex: 2 }} isLoading={saving}>{editing ? 'Save changes' : 'Add supplier'}</Button>
        </div>
      </Modal>
    </>
  );
}
