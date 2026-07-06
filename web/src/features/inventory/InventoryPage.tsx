import { useState, useMemo } from 'react';
import { useProducts, statusFor } from '@/features/products/productsStore';
import { useInventory, type AdjustReason } from './inventoryStore';
import { useSession } from '@/store/session';
import { DataTable, Card, Button, Modal, Input, Badge, toast, type Column } from '@/components/ui';

const REASONS: AdjustReason[] = ['Restock', 'Damage', 'Recount', 'Expired'];

export default function InventoryPage() {
  const by = useSession((s) => s.user?.name ?? 'Staff');
  const products = useProducts((s) => s.products);
  const { adjustments, adjust } = useInventory();
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState<AdjustReason>('Restock');
  const [note, setNote] = useState('');

  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.reorderPoint), [products]);

  const submit = () => {
    if (!productId) return toast('Choose a product');
    const res = adjust(productId, delta, reason, note, by);
    if (!res.ok) return toast(res.error ?? 'Could not adjust');
    toast('Stock adjusted');
    setOpen(false); setProductId(''); setDelta(0); setNote('');
  };

  const lowCols: Column<(typeof lowStock)[number]>[] = [
    { key: 'name', header: 'Product', render: (p) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.emoji} {p.name}</span> },
    { key: 'stock', header: 'On hand', align: 'right', render: (p) => <span className="mono" style={{ color: 'var(--red)' }}>{p.stock}</span> },
    { key: 'reorderPoint', header: 'Reorder at', align: 'right', render: (p) => <span className="mono">{p.reorderPoint}</span> },
    { key: 'suggest', header: 'Suggested', align: 'right', render: (p) => <span className="mono">{Math.max(p.reorderPoint * 2 - p.stock, p.reorderPoint)}</span> },
    { key: 'status', header: 'Status', render: (p) => { const s = statusFor(p); return <Badge tone={s === 'Out of stock' ? 'red' : 'amber'}>{s}</Badge>; } },
    { key: 'act', header: '', align: 'right', render: (p) => <Button variant="ghost" size="sm" onClick={() => toast(`Draft PO created for ${p.name}`)}>Create PO</Button> },
  ];

  const histCols: Column<(typeof adjustments)[number]>[] = [
    { key: 'productName', header: 'Product' },
    { key: 'delta', header: 'Change', align: 'right', render: (a) => <span className="mono" style={{ color: a.delta > 0 ? 'var(--green)' : 'var(--red)' }}>{a.delta > 0 ? '+' : ''}{a.delta}</span> },
    { key: 'reason', header: 'Reason', render: (a) => <Badge tone="grey">{a.reason}</Badge> },
    { key: 'by', header: 'By' },
    { key: 'at', header: 'Date', render: (a) => <span className="mono">{new Date(a.at).toLocaleDateString()}</span> },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Catalog</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Inventory &amp; stock</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Track quantity on hand and log manual adjustments.</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Adjust stock</Button>
      </div>

      {lowStock.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF8EC', color: '#B45309', border: '1px solid #FBE3B3', padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 18, fontWeight: 500 }}>
          ⚠ {lowStock.length} product{lowStock.length > 1 ? 's are' : ' is'} below the reorder threshold.
        </div>
      )}

      <Card style={{ marginBottom: 18 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Low-stock alerts</h3></div>
        <DataTable columns={lowCols} data={lowStock} rowKey={(p) => p.id} emptyText="All products above threshold." />
      </Card>

      <Card>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}><h3 style={{ margin: 0, fontSize: 15, color: 'var(--ink)' }}>Recent stock adjustments</h3></div>
        <DataTable columns={histCols} data={adjustments} rowKey={(a) => a.id} emptyText="No adjustments yet." />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Adjust stock">
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Product</label>
        <select aria-label="Product" value={productId} onChange={(e) => setProductId(e.target.value)} style={{ width: '100%', padding: '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, marginBottom: 16, background: 'var(--card)', color: 'var(--ink)' }}>
          <option value="">Select a product…</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} (on hand: {p.stock})</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Change (+/-)" type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Reason</label>
            <select aria-label="Reason" value={reason} onChange={(e) => setReason(e.target.value as AdjustReason)} style={{ width: '100%', padding: '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, marginBottom: 16, background: 'var(--card)', color: 'var(--ink)' }}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Apply adjustment</Button>
        </div>
      </Modal>
    </>
  );
}
