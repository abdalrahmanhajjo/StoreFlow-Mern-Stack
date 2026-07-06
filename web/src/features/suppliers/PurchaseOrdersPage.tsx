import { useSupply, type PurchaseOrder } from './supplyStore';
import { DataTable, Badge, Button, toast, type Column } from '@/components/ui';

export default function PurchaseOrdersPage() {
  const { purchaseOrders, receivePO } = useSupply();

  const onReceive = (po: PurchaseOrder) => {
    const added = receivePO(po.id);
    toast(`${po.poNo} received — ${added} units added to stock`);
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: 'poNo', header: 'PO #', render: (p) => <span className="mono">{p.poNo}</span> },
    { key: 'supplier', header: 'Supplier' },
    { key: 'units', header: 'Items', render: (p) => <span className="mono">{p.lines.reduce((n, l) => n + l.qty, 0)} units</span> },
    { key: 'status', header: 'Status', render: (p) => <Badge tone={p.status === 'received' ? 'green' : 'amber'}>{p.status === 'received' ? 'Received' : 'Pending'}</Badge> },
    { key: 'ordered', header: 'Ordered', render: (p) => <span className="mono">{p.ordered}</span> },
    { key: 'expected', header: 'Expected', render: (p) => <span className="mono">{p.expected}</span> },
    { key: 'act', header: '', align: 'right', render: (p) => (
      p.status === 'pending'
        ? <Button size="sm" onClick={() => onReceive(p)}>Mark received</Button>
        : <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>completed</span>
    ) },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Relationships</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Purchase orders</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Receiving a PO increases stock automatically.</p>
        </div>
        <Button onClick={() => toast('New purchase order draft created')}>+ New purchase order</Button>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={purchaseOrders} rowKey={(p) => p.id} emptyText="No purchase orders yet." />
      </div>
    </>
  );
}
