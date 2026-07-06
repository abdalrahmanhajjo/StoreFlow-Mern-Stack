import { useState, useMemo } from 'react';
import { useCategories } from './categoriesStore';
import { useProducts } from '@/features/products/productsStore';
import { DataTable, Button, Input, confirmDialog, toast, type Column } from '@/components/ui';

interface Row { id: string; name: string; emoji: string; count: number }

// SF-602: category management with product counts + delete guard
export default function CategoriesPage() {
  const { categories, create, remove } = useCategories();
  const products = useProducts((s) => s.products);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [desc, setDesc] = useState('');

  const rows: Row[] = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, count: products.filter((p) => p.category === c.name).length })),
    [categories, products]
  );

  const onCreate = () => {
    if (name.trim().length < 2) return toast('Enter a category name');
    const res = create(name, emoji, desc);
    if (!res.ok) return toast(res.error ?? 'Could not create');
    toast(`Category “${name}” added`);
    setName(''); setEmoji(''); setDesc('');
  };

  const onDelete = async (r: Row) => {
    if (r.count > 0) return toast(`Reassign ${r.count} product(s) before deleting “${r.name}”`);
    if (await confirmDialog(`Delete category “${r.name}”?`)) {
      remove(r.id);
      toast(`“${r.name}” deleted`);
    }
  };

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Category', render: (r) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.emoji} {r.name}</span> },
    { key: 'count', header: 'Products', align: 'right', render: (r) => <span className="mono">{r.count}</span> },
    { key: 'actions', header: '', align: 'right', render: (r) => <Button variant="danger" size="sm" onClick={() => onDelete(r)}>Delete</Button> },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Catalog</div>
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Categories</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <DataTable columns={columns} data={rows} rowKey={(r) => r.id} emptyText="No categories yet." />
        </div>
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 18 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 12 }}>New category</div>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frozen foods" />
          <Input label="Emoji (optional)" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🧊" />
          <Input label="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Button onClick={onCreate}>Save category</Button>
        </div>
      </div>
    </>
  );
}
