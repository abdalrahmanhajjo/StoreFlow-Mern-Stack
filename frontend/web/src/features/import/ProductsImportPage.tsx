import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ImportWizard } from './ImportWizard';
import { useProducts, type ProductInput } from '@/features/products/productsStore';
import { Button } from '@/components/ui';

// One CSV row → one product. Headers must match these keys.
const rowSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sku: z.string().trim().min(2).max(50),
  category: z.string().trim().min(1),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  barcode: z.string().trim().max(50).optional().default(''),
  stock: z.coerce.number().int().min(0).optional().default(0),
  reorderPoint: z.coerce.number().int().min(0).optional().default(10),
});

type Row = z.infer<typeof rowSchema>;

export default function ProductsImportPage() {
  const navigate = useNavigate();

  const onImport = async (rows: Row[]) => {
    const create = useProducts.getState().create;
    const failed: string[] = [];
    for (const r of rows) {
      const input: ProductInput = {
        name: r.name,
        sku: r.sku,
        barcode: r.barcode ?? '',
        price: r.price,
        cost: r.cost,
        stock: r.stock ?? 0,
        reorderPoint: r.reorderPoint ?? 10,
        emoji: '📦',
        image: '',
        category: r.category,
      };
      const res = create(input);
      if (!res.ok) failed.push(`${r.sku}: ${res.error}`);
    }
    if (failed.length) {
      throw new Error(`${failed.length} row(s) skipped — ${failed.slice(0, 3).join('; ')}${failed.length > 3 ? '…' : ''}`);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Catalog</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Import products</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>
            Upload a CSV with columns: <code>name, sku, category, price, cost</code> (and optional <code>barcode, stock, reorderPoint</code>). Categories must already exist.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/products')}>← Back to products</Button>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 20 }}>
        <ImportWizard
          entityName="products"
          rowSchema={rowSchema}
          dedupeKey="sku"
          onImport={onImport}
        />
      </div>
    </>
  );
}
