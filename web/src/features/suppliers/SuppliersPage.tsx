import { useState } from 'react';
import { useSupply, type Supplier } from './supplyStore';
import { DataTable, Button, Modal, Input, confirmDialog, toast, type Column } from '@/components/ui';

export default function SuppliersPage() {
  const { suppliers, purchaseOrders, addSupplier, removeSupplier } = useSupply();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const openOrders = (supplierName: string) => purchaseOrders.filter((p) => p.supplier === supplierName && p.status === 'pending').length;

  const submit = () => {
    const res = addSupplier(name, phone, email);
    if (!res.ok) return toast(res.error ?? 'Could not add');
    toast(`${name} added`);
    setOpen(false); setName(''); setPhone(''); setEmail('');
  };
  const onDelete = async (s: Supplier) => {
    if (await confirmDialog(`Remove supplier "${s.name}"?`)) {
      removeSupplier(s.id);
      toast(`${s.name} removed`);
    }
  };

  const columns: Column<Supplier>[] = [
    { key: 'name', header: 'Supplier', render: (s) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</span> },
    { key: 'contact', header: 'Contact', render: (s) => <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{s.phone} · {s.email}</span> },
    { key: 'productCount', header: 'Products', align: 'right', render: (s) => <span className="mono">{s.productCount}</span> },
    { key: 'open', header: 'Open orders', align: 'right', render: (s) => <span className="mono">{openOrders(s.name)}</span> },
    { key: 'act', header: '', align: 'right', render: (s) => <Button variant="danger" size="sm" onClick={() => onDelete(s)}>Remove</Button> },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Relationships</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Suppliers</h2>
        </div>
        <Button onClick={() => setOpen(true)}>+ Add supplier</Button>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={suppliers} rowKey={(s) => s.id} emptyText="No suppliers yet." />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add supplier">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Wholesale" />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="orders@acme.com" />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Save supplier</Button>
        </div>
      </Modal>
    </>
  );
}
