import { useState, useRef, useCallback } from 'react';
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
type ImageMode = 'url' | 'upload' | 'emoji';

const VALIDATED_FIELDS: (keyof ProductInput)[] = ['name', 'sku', 'barcode', 'category', 'price', 'cost', 'stock', 'reorderPoint'];

const FIELD_LABELS: Record<keyof ProductInput, string> = {
  name: 'Name',
  sku: 'SKU',
  barcode: 'Barcode',
  category: 'Category',
  price: 'Price',
  cost: 'Cost',
  stock: 'Stock',
  reorderPoint: 'Reorder point',
  emoji: 'Emoji',
  image: 'Image',
  supplierId: 'Supplier',
};

function validateField(key: keyof ProductInput, value: unknown): string | undefined {
  const fieldSchema = key in productSchema.shape ? productSchema.shape[key as keyof typeof productSchema.shape] : undefined;
  if (!fieldSchema) return;
  const result = fieldSchema.safeParse(value);
  if (!result.success) return result.error.issues[0].message;
}

const EMOJI_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Beverages', items: ['🥤', '🧃', '☕', '🍵', '🧉', '🥛', '🍺', '🍷', '🧊'] },
  { label: 'Bakery & Dairy', items: ['🍞', '🥐', '🥨', '🥖', '🧀', '🥚', '🧈', '🥞', '🧁', '🍰'] },
  { label: 'Produce & Meat', items: ['🍎', '🍌', '🍇', '🍊', '🍋', '🍅', '🥑', '🥕', '🌽', '🥩', '🍗', '🐟', '🥒', '🌶️'] },
  { label: 'Pantry & Meals', items: ['🍚', '🍝', '🥫', '🧂', '🍯', '🥜', '🍜', '🍟', '🌮', '🥗', '🍕', '🍳'] },
  { label: 'Snacks & Sweets', items: ['🍫', '🍪', '🍩', '🍿', '🍭', '🍦', '🍇', '🍓'] },
  { label: 'Household', items: ['🧴', '🧻', '🧹', '🧽', '🧺', '🧼', '🪣', '🧯', '🔦'] },
  { label: 'Pharmacy & Health', items: ['💊', '💉', '🌡️', '🩹', '🩺', '🧬', '🦠', '🩻', '👁️', '🦷', '🧴'] },
  { label: 'Electronics', items: ['💻', '📱', '⌚', '📷', '🔌', '🔋', '🎧', '🖥️', '🎮', '📡', '🖨️'] },
  { label: 'Clothing & Accessories', items: ['👕', '👗', '👖', '🧥', '👟', '👛', '👜', '🧢', '👔', '🧣', '⌚'] },
  { label: 'General', items: ['📦', '🧾', '🏷️', '📋', '🔗', '⚙️', '🔧', '🛒', '🗂️'] },
];

export function ProductForm({ open, onClose, editing }: Props) {
  const { create, update } = useProducts();
  const categories = useCategories((s) => s.categories);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const [shake, setShake] = useState(0);

  const [form, setForm] = useState<ProductInput>(
    editing
      ? { ...editing }
      : { name: '', sku: '', barcode: '', price: 0, cost: 0, stock: 0, reorderPoint: 10, emoji: '📦', image: '', category: categories[0]?.name ?? 'Beverages' }
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<keyof ProductInput>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState<ImageMode>(form.image ? 'url' : 'emoji');
  const [urlDraft, setUrlDraft] = useState(form.image);

  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (touched.has(k)) {
      const err = validateField(k, v);
      setErrors((e) => (err ? { ...e, [k]: err } : (e[k] ? { ...e, [k]: undefined } : e)));
    }
  };

  const handleBlur = <K extends keyof ProductInput>(k: K) => {
    if (!touched.has(k)) {
      setTouched((prev) => new Set(prev).add(k));
    }
    const err = validateField(k, form[k]);
    setErrors((e) => (err ? { ...e, [k]: err } : (e[k] ? { ...e, [k]: undefined } : e)));
  };

  const scrollToError = useCallback((keys: (keyof ProductInput)[]) => {
    const first = keys[0];
    if (!first) return;
    const el = fieldRefs.current[first];
    if (el && 'focus' in el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB', `${(file.size / 1024 / 1024).toFixed(1)} MB file is too large`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      set('image', dataUrl);
      toast.success('Image uploaded', `${(file.size / 1024).toFixed(0)} KB · tap Save to persist`);
    };
    reader.readAsDataURL(file);
  };

  const applyUrl = () => {
    if (!urlDraft.trim()) return;
    set('image', urlDraft.trim());
    toast.success('Image URL applied');
  };

  const selectEmoji = (emoji: string) => {
    set('emoji', emoji);
    set('image', '');
  };

  const submit = () => {
    if (submitting) return;

    const next: FieldErrors = {};
    for (const key of VALIDATED_FIELDS) {
      const err = validateField(key, form[key]);
      if (err) next[key] = err;
    }
    setErrors(next);
    setTouched(new Set(VALIDATED_FIELDS));

    const keys = Object.keys(next) as (keyof ProductInput)[];
    if (keys.length > 0) {
      toast.error(`Please fix ${keys.length} field${keys.length > 1 ? 's' : ''}`, 'Validation failed');
      setShake((n) => n + 1);
      setTimeout(() => scrollToError(keys), 100);
      return;
    }

    setSubmitting(true);
    try {
      const clean: ProductInput = { ...form, ...productSchema.parse(form) };
      if (editing) {
        update(editing.id, clean);
        toast.success(`${clean.name} saved`, 'Product updated successfully');
      } else {
        const res = create(clean);
        if (!res.ok) {
          setErrors({ sku: res.error ?? 'Could not create' });
          if (!touched.has('sku')) setTouched((prev) => new Set(prev).add('sku'));
          toast.error(res.error ?? 'Could not create', 'Duplicate SKU');
          setTimeout(() => scrollToError(['sku']), 100);
          return;
        }
        toast.success(`${clean.name} added to catalog`, 'Product created');
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const hasImage = !!form.image;
  const erroredFields = Object.keys(errors) as (keyof ProductInput)[];

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit product' : 'Add product'}>
      <style>{`
        @keyframes sf-form-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .sf-shake-${shake % 2} { animation: sf-form-shake .35s ease-out; }
        .sf-error-item { transition: background .1s; border-radius: 6px; cursor: pointer; padding: 2px 4px; margin: 0 -4px; }
        .sf-error-item:hover { background: rgba(185,28,28,.08); }
        .sf-error-item:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) {
          .sf-shake-0, .sf-shake-1, .sf-error-item { animation: none; transition: none; }
        }
      `}</style>

      {erroredFields.length > 0 && (
        <div role="alert" style={{
          background: 'var(--red-soft)', border: '1px solid #e5c4bd',
          borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13,
          color: 'var(--red-deep)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: erroredFields.length > 1 ? 8 : 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9c3225" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontWeight: 600 }}>Please fix {erroredFields.length} field{erroredFields.length > 1 ? 's' : ''}:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', paddingLeft: 26 }}>
            {erroredFields.map((key) => (
              <button
                key={key}
                type="button"
                className="sf-error-item"
                onClick={() => scrollToError([key])}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 12.5, color: 'var(--red-deep)', display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontFamily: 'inherit',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                {FIELD_LABELS[key] ?? key}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`sf-shake-${shake % 2}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Input
            ref={(el) => { fieldRefs.current.name = el; }}
            label="Name"
            value={form.name}
            error={errors.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder="e.g. Organic Honey 500g"
          />
        </div>
        <Input
          ref={(el) => { fieldRefs.current.sku = el; }}
          label="SKU"
          value={form.sku}
          error={errors.sku}
          onChange={(e) => set('sku', e.target.value)}
          onBlur={() => handleBlur('sku')}
          placeholder="e.g. 10042"
        />
        <Input
          ref={(el) => { fieldRefs.current.barcode = el; }}
          label="Barcode"
          value={form.barcode}
          error={errors.barcode}
          onChange={(e) => set('barcode', e.target.value)}
          onBlur={() => handleBlur('barcode')}
          placeholder="e.g. 5449000000996"
          hint="Optional — used for scanning at the POS."
        />
        <div>
          <label htmlFor="pf-category" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Category</label>
          <select
            ref={(el) => { fieldRefs.current.category = el; }}
            id="pf-category"
            value={form.category}
            onChange={(e) => { set('category', e.target.value); }}
            onBlur={() => handleBlur('category')}
            aria-invalid={!!errors.category}
            style={{
              width: '100%', padding: '12px 13px',
              border: `1px solid ${errors.category ? 'var(--red)' : 'var(--line)'}`,
              borderRadius: 11, fontFamily: 'inherit', fontSize: 14,
              marginBottom: errors.category ? 2 : 16,
              background: 'var(--card)', color: 'var(--ink)',
            }}
          >
            {categories.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
          {errors.category && <p style={{ margin: '0 0 14px', color: 'var(--red)', fontSize: 11.5 }}>{errors.category}</p>}
        </div>
        <Input
          ref={(el) => { fieldRefs.current.price = el; }}
          label="Price"
          type="number" min={0} step="0.01"
          value={form.price}
          error={errors.price}
          onChange={(e) => set('price', Number(e.target.value))}
          onBlur={() => handleBlur('price')}
          placeholder="0.00"
        />
        <Input
          ref={(el) => { fieldRefs.current.cost = el; }}
          label="Cost"
          type="number" min={0} step="0.01"
          value={form.cost}
          error={errors.cost}
          onChange={(e) => set('cost', Number(e.target.value))}
          onBlur={() => handleBlur('cost')}
          placeholder="0.00"
        />
        <Input
          ref={(el) => { fieldRefs.current.stock = el; }}
          label="Stock"
          type="number" min={0} step="1"
          value={form.stock}
          error={errors.stock}
          onChange={(e) => set('stock', Number(e.target.value))}
          onBlur={() => handleBlur('stock')}
          placeholder="0"
        />
        <Input
          ref={(el) => { fieldRefs.current.reorderPoint = el; }}
          label="Reorder at"
          type="number" min={0} step="1"
          value={form.reorderPoint}
          error={errors.reorderPoint}
          onChange={(e) => set('reorderPoint', Number(e.target.value))}
          onBlur={() => handleBlur('reorderPoint')}
          placeholder="10"
          hint="Low-stock alert threshold"
        />

        {/* Image picker */}
        <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Product image <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span></label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 12, overflow: 'hidden',
              background: 'var(--paper)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 36, flexShrink: 0,
              border: hasImage ? '2px solid var(--blue-soft)' : '2px solid var(--line-soft)',
              boxShadow: hasImage ? '0 0 0 3px var(--blue-soft)' : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}>
              <ProductThumb src={safeImageUrl(form.image)} emoji={form.emoji} alt="Preview" size={76} radius={10} />
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              {hasImage ? (
                <span style={{ color: 'var(--green)', fontWeight: 500 }}>✓ Image set</span>
              ) : (
                <><span style={{ fontWeight: 500, color: 'var(--ink)' }}>{form.emoji}</span> will be shown until an image is added.</>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 2, marginBottom: 12, background: 'var(--paper)', borderRadius: 9, padding: 3 }}>
            {(['url', 'upload', 'emoji'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setImageMode(mode)}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                  border: 'none', borderRadius: 7, cursor: 'pointer',
                  background: imageMode === mode ? 'var(--card)' : 'transparent',
                  color: imageMode === mode ? 'var(--ink)' : 'var(--ink-soft)',
                  boxShadow: imageMode === mode ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                  transition: 'background .1s',
                }}
              >
                {mode === 'url' ? '🔗 URL' : mode === 'upload' ? '📁 Upload' : '😊 Emoji'}
              </button>
            ))}
          </div>

          {imageMode === 'url' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://example.com/product.jpg"
                  hint="Leave blank to use the emoji fallback."
                />
              </div>
              <Button size="sm" onClick={applyUrl} style={{ marginTop: 2 }} disabled={!urlDraft.trim()}>Apply</Button>
            </div>
          )}

          {imageMode === 'upload' && (
            <div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={handleFile} style={{ display: 'none' }} />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = 'var(--blue-soft)'; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--paper)'; }}
                onDrop={(e) => {
                  e.preventDefault(); e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--paper)';
                  const file = e.dataTransfer.files?.[0]; if (!file) return;
                  if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB', `${(file.size / 1024 / 1024).toFixed(1)} MB file is too large`); return; }
                  const reader = new FileReader();
                  reader.onload = () => { set('image', reader.result as string); toast.success('Image uploaded', `${(file.size / 1024).toFixed(0)} KB · tap Save to persist`); };
                  reader.readAsDataURL(file);
                }}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
                aria-label="Upload product image"
                style={{ border: '2px dashed var(--line)', borderRadius: 11, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--paper)', transition: 'border-color .15s, background .15s', outline: 'none' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>Click or drag & drop</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-faint)' }}>PNG, JPG, WebP, AVIF · max 2 MB</p>
              </div>
            </div>
          )}

          {imageMode === 'emoji' && (
            <div style={{ maxHeight: 220, overflowY: 'auto', padding: '6px 4px', background: 'var(--paper)', borderRadius: 11, border: '1px solid var(--line-soft)', scrollbarWidth: 'thin' }}>
              <style>{`.sf-emoji-scroll::-webkit-scrollbar { width: 4px; } .sf-emoji-scroll::-webkit-scrollbar-thumb { background: var(--line); border-radius: 4px; }`}</style>
              <div className="sf-emoji-scroll">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.label} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-faint)', padding: '4px 6px 6px', marginBottom: 2 }}>{group.label}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 4px' }}>
                      {group.items.map((emoji) => (
                        <button
                          key={emoji} type="button" onClick={() => selectEmoji(emoji)} aria-label={`Use emoji ${emoji}`}
                          style={{ width: 36, height: 36, fontSize: 18, border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: form.emoji === emoji ? 'var(--blue-soft)' : 'transparent', boxShadow: form.emoji === emoji ? '0 0 0 2px var(--blue)' : 'none', transition: 'background .1s' }}
                          onMouseEnter={(e) => { if (form.emoji !== emoji) e.currentTarget.style.background = 'var(--card)'; }}
                          onMouseLeave={(e) => { if (form.emoji !== emoji) e.currentTarget.style.background = 'transparent'; }}
                        >{emoji}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={submit} isLoading={submitting}>
          {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add product'}
        </Button>
      </div>
    </Modal>
  );
}
