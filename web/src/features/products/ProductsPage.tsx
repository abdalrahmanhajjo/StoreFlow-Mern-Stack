import { useState, useMemo } from 'react';
import { useProducts, statusFor, type Product } from './productsStore';
import { useCategories } from '@/features/categories/categoriesStore';
import { ProductForm } from './ProductForm';
import { useSession } from '@/store/session';
import { can } from '@/lib/rbac';
import { money } from '@/lib/format';
import { DataTable, Badge, Button, ProductThumb, confirmDialog, toast, type Column } from '@/components/ui';

export default function ProductsPage() {
  const role = useSession((s) => s.user!.role);
  const writable = can(role, 'product.write'); // owner only; manager/cashier view-only
  const { products, remove } = useProducts();
  const categories = useCategories((s) => s.categories);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [stock, setStock] = useState('any');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const st = statusFor(p);
      const matchQ = !term || p.name.toLowerCase().includes(term) || p.sku.includes(term);
      const matchCat = cat === 'All' || p.category === cat;
      const matchStock =
        stock === 'any' ||
        (stock === 'in' && st === 'In stock') ||
        (stock === 'low' && st === 'Low stock') ||
        (stock === 'out' && st === 'Out of stock');
      return matchQ && matchCat && matchStock;
    });
  }, [products, q, cat, stock]);

  const onDelete = async (p: Product) => {
    if (await confirmDialog(`Delete "${p.name}"? This cannot be undone.`)) {
      remove(p.id);
      toast(`${p.name} deleted`);
    }
  };

  const badge = (p: Product) => {
    const s = statusFor(p);
    return <Badge tone={s === 'In stock' ? 'green' : s === 'Low stock' ? 'amber' : 'red'}>{s}</Badge>;
  };

  const columns: Column<Product>[] = [
    { key: 'name', header: 'Product', render: (p) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
        <ProductThumb src={p.image} emoji={p.emoji} alt={p.name} size={36} radius={8} />
        <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</span>
      </span>
    ) },
    { key: 'sku', header: 'SKU', render: (p) => <span className="mono">{p.sku}</span> },
    { key: 'category', header: 'Category' },
    { key: 'price', header: 'Price', align: 'right', render: (p) => <span className="mono">{money(p.price)}</span> },
    { key: 'stock', header: 'Stock', align: 'right', render: (p) => <span className="mono">{p.stock}</span> },
    { key: 'status', header: 'Status', render: badge },
    ...(writable
      ? [{
          key: 'actions', header: '', align: 'right' as const,
          render: (p: Product) => (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setFormOpen(true); }}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => onDelete(p)}>Delete</Button>
            </div>
          ),
        }]
      : []),
  ];

  const selStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, background: '#fff', fontFamily: 'inherit', color: 'var(--ink)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Catalog</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Products</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>{products.length} products across {categories.length} categories.</p>
        </div>
        {writable && <Button onClick={() => { setEditing(null); setFormOpen(true); }}>+ Add product</Button>}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or barcode" style={{ ...selStyle, width: 240 }} />
        <select aria-label="Filter by category" value={cat} onChange={(e) => setCat(e.target.value)} style={selStyle}>
          <option value="All">All categories</option>
          {categories.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Filter by stock" value={stock} onChange={(e) => setStock(e.target.value)} style={selStyle}>
          <option value="any">Stock: any</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} rowKey={(p) => p.id} emptyText="No products match your filters." />
      </div>

      {writable && <ProductForm key={editing?.id ?? 'new'} open={formOpen} onClose={() => setFormOpen(false)} editing={editing} />}
    </>
  );
}
