import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from './productsStore';
import { useCategories } from '@/features/categories/categoriesStore';
import { useSession } from '@/store/session';
import { can } from '@/lib/rbac';
import { ProductGrid } from './ProductGrid';
import { ProductForm } from './ProductForm';
import { SearchField, CategoryPills, Button } from '@/components/ui';
import { PlanLimitBanner } from '@/components/access/PlanLimitBanner';
import type { Product } from './productsStore';

export default function ProductsPage() {
  const navigate = useNavigate();
  const role = useSession((s) => s.user!.role);
  const writable = can(role, 'product.write');
  const { products } = useProducts();
  const categories = useCategories((s) => s.categories);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('any');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const catNames = useMemo(() => ['All', ...categories.map((c) => c.name)], [categories]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    for (const p of products) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setFormOpen(true); };

  const handleBarcode = (code: string) => {
    // In a real app this would query a barcode index.
    // For the mock, skip debounce and search SKU immediately.
    setQuery(code);
  };

  const stockOpts = [
    { value: 'any', label: 'All stock' },
    { value: 'in', label: 'In stock' },
    { value: 'low', label: 'Low stock' },
    { value: 'out', label: 'Out of stock' },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Catalog</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Products</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>{products.length} products across {categories.length} categories.</p>
        </div>
        {writable && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => navigate('/products/import')}>⤒ Import CSV</Button>
            <Button onClick={openNew}>+ Add product</Button>
          </div>
        )}
      </div>

      <PlanLimitBanner
        limitKey="productsPerStore"
        currentCount={products.length}
        label="products"
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 280px', minWidth: 200, maxWidth: 400 }}>
          <SearchField
            value={query}
            onChange={setQuery}
            onBarcodeScan={handleBarcode}
            placeholder="Search by name, SKU, barcode…"
            aria-label="Search products"
            autoComplete="off"
          />
        </div>
        <select
          aria-label="Filter by stock status"
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          style={{
            padding: '0 14px', height: 44, border: '1px solid var(--line)', borderRadius: 11,
            fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)',
            cursor: 'pointer', minWidth: 130,
          }}
        >
          {stockOpts.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 18 }}>
        <CategoryPills
          categories={catNames}
          selected={category}
          counts={catCounts}
          onChange={setCategory}
        />
      </div>

      <div style={{
        background: 'var(--card)', border: '1px solid var(--line-soft)',
        borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 20,
      }}>
        <ProductGrid
          query={query}
          category={category}
          stockFilter={stockFilter}
          onEdit={openEdit}
          writable={writable}
        />
      </div>

      {writable && (
        <ProductForm
          key={editing?.id ?? 'new'}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          editing={editing}
        />
      )}
    </>
  );
}
