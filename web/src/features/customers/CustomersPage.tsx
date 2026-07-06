import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from './customersStore';
import { useSales } from '@/features/sales/salesStore';
import { tierFor } from './loyalty';
import { useSession } from '@/store/session';
import { can } from '@/lib/rbac';
import { money, points as fmtPoints } from '@/lib/format';
import { DataTable, TierBadge, Button, Modal, Input, toast, type Column } from '@/components/ui';

interface Row { id: string; name: string; phone: string; points: number; spent: number; orders: number }

export default function CustomersPage() {
  const navigate = useNavigate();
  const role = useSession((s) => s.user!.role);
  const { customers, create } = useCustomers();
  const sales = useSales((s) => s.sales);
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const rows: Row[] = useMemo(() => {
    const term = q.trim().toLowerCase();
    return customers
      .filter((c) => !term || c.name.toLowerCase().includes(term) || c.phone.toLowerCase().includes(term))
      .map((c) => ({
        ...c,
        orders: sales.filter((s) => s.customerName === c.name).length,
      }));
  }, [customers, sales, q]);

  const columns: Column<Row>[] = [
    { key: 'name', header: 'Customer', render: (r) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.name}</span> },
    { key: 'phone', header: 'Phone', render: (r) => <span className="mono">{r.phone || '—'}</span> },
    { key: 'orders', header: 'Orders', align: 'right', render: (r) => <span className="mono">{r.orders}</span> },
    { key: 'spent', header: 'Total spent', align: 'right', render: (r) => <span className="mono">{money(r.spent)}</span> },
    { key: 'points', header: 'Points', align: 'right', render: (r) => <span className="mono">{fmtPoints(r.points)}</span> },
    { key: 'tier', header: 'Tier', render: (r) => <TierBadge tier={tierFor(r.points)} /> },
    { key: 'actions', header: '', align: 'right', render: (r) => <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${r.id}`)}>View</Button> },
  ];

  const submitAdd = () => {
    if (name.trim().length < 2) return toast('Enter a customer name');
    const c = create(name, phone);
    toast(`Customer “${c.name}” added`);
    setAdding(false); setName(''); setPhone('');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Relationships</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Customers</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Loyalty points earned on every sale.</p>
        </div>
        {/* SF-901: add hidden for manager (view-only) */}
        {can(role, 'customer.create') && <Button onClick={() => setAdding(true)}>+ Add customer</Button>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" style={{ width: 260, maxWidth: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, fontFamily: 'inherit', color: 'var(--ink)', background: '#fff' }} />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} rowKey={(r) => r.id} emptyText="No customers found." />
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add customer">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamie Rivera" />
        <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0134" />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          <Button onClick={submitAdd}>Save customer</Button>
        </div>
      </Modal>
    </>
  );
}
