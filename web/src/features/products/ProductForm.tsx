import { useState } from 'react';
import { useProducts, type Product, type ProductInput } from './productsStore';
import { useCategories } from '@/features/categories/categoriesStore';
import { productSchema } from '@/lib/validation/product';
import { safeImageUrl } from '@/lib/security/url';
import { Modal, Input, Button, ProductThumb, toast } from '@/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: Product | null;
}

type FieldErrors = Partial<Record<keyof ProductInput, string>>;

// SF-601: create/edit product with centralised zod validation, per-field errors,
// safe image URLs, and double-submit protection.
export function ProductForm({ open, onClose, editing }: Props) {
  const { create, update } = useProducts();
  const categories = useCategories((s) => s.categories);
  const [form, setForm] = useState<ProductInput>(
    editing
      ? { ...editing }
      : { name: '', sku: '', price: 0, cost: 0, stock: 0, reorderPoint: 10, emoji: '📦', image: '', category: categories[0]?.name ?? 'Beverages' }
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = () => {
    if (submitting) return; // anti double-submit
    const parsed = productSchema.safeParse(form);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ProductInput;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSubmitting(true);
    try {
      // Persist the sanitised image URL from the schema transform, not the raw input.
      const clean: ProductInput = { ...form, ...parsed.data };
      if (editing) {
        update(editing.id, clean);
        toast(`${clean.name} updated`);
      } else {
        const res = create(clean);
        if (!res.ok) {
          setErrors({ sku: res.error ?? 'Could not create' });
          toast.error(res.error ?? 'Could not create');
          return;
        }
        toast(`${clean.name} added`);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit product' : 'Add product'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Name" value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <Input label="SKU / Barcode" value={form.sku} error={errors.sku} onChange={(e) => set('sku', e.target.value)} />
        <div>
          <label htmlFor="pf-category" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Category</label>
          <select id="pf-category" value={form.category} onChange={(e) => set('category', e.target.value)} style={{ width: '100%', padding: '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, marginBottom: 16, background: 'var(--card)', color: 'var(--ink)' }}>
            {categories.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Input label="Price" type="number" min={0} step="0.01" value={form.price} error={errors.price} onChange={(e) => set('price', Number(e.target.value))} />
        <Input label="Cost" type="number" min={0} step="0.01" value={form.cost} error={errors.cost} onChange={(e) => set('cost', Number(e.target.value))} />
        <Input label="Stock" type="number" min={0} step="1" value={form.stock} error={errors.stock} onChange={(e) => set('stock', Number(e.target.value))} />
        <Input label="Reorder at" type="number" min={0} step="1" value={form.reorderPoint} error={errors.reorderPoint} onChange={(e) => set('reorderPoint', Number(e.target.value))} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Input label="Image URL (optional)" value={form.image} error={errors.image} onChange={(e) => set('image', e.target.value)} placeholder="https://…  (leave blank to use the emoji)" hint="Only http(s) links are accepted." />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ProductThumb src={safeImageUrl(form.image)} emoji={form.emoji} alt="Preview" size={44} radius={9} />
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Preview — falls back to the emoji if the image is empty or broken.</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} isLoading={submitting}>{editing ? 'Save changes' : 'Add product'}</Button>
      </div>
    </Modal>
  );
}
