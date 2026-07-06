import { useState } from 'react';
import { useEmployees, type Employee, type StaffRole } from './employeesStore';
import { useSession } from '@/store/session';
import { can } from '@/lib/rbac';
import { DataTable, Badge, Button, Modal, Input, confirmDialog, toast, type Column } from '@/components/ui';

export default function EmployeesPage() {
  const myRole = useSession((s) => s.user!.role);
  const { employees, invite, setRole, toggleStatus, remove } = useEmployees();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // Managers may only add cashiers (SF-1102)
  const [role, setNewRole] = useState<StaffRole>(myRole === 'manager' ? 'cashier' : 'manager');

  const submitInvite = () => {
    if (name.trim().length < 2) return toast('Enter a name');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Enter a valid email');
    const res = invite(name, email, role);
    if (!res.ok) return toast(res.error ?? 'Could not add');
    toast(`Invite sent to ${email}`);
    setOpen(false); setName(''); setEmail('');
  };

  const onDelete = async (e: Employee) => {
    if (await confirmDialog(`Remove ${e.name}?`)) {
      remove(e.id);
      toast(`${e.name} removed`);
    }
  };

  const columns: Column<Employee>[] = [
    { key: 'name', header: 'Name', render: (e) => <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.name}</span> },
    {
      key: 'role', header: 'Role',
      render: (e) => {
        const editable = e.role !== 'owner' && can(myRole, 'employee.editRole', e.role);
        if (!editable) return <Badge tone={e.role === 'owner' ? 'amber' : 'grey'}>{cap(e.role)}</Badge>;
        return (
          <select aria-label={`Role for ${e.name}`} value={e.role} onChange={(ev) => { setRole(e.id, ev.target.value as StaffRole); toast(`${e.name} is now ${ev.target.value}`); }} style={{ padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: 12.5, background: '#fff', color: 'var(--ink)' }}>
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
          </select>
        );
      },
    },
    { key: 'email', header: 'Email', render: (e) => <span className="mono" style={{ fontSize: 12 }}>{e.email}</span> },
    { key: 'status', header: 'Status', render: (e) => <Badge tone={e.status === 'active' ? 'green' : 'red'}>{e.status === 'active' ? 'Active' : 'Disabled'}</Badge> },
    {
      key: 'actions', header: '', align: 'right',
      render: (e) => {
        if (e.role === 'owner') return <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>owner</span>;
        const canManage = can(myRole, 'employee.delete', e.role); // owner: all; manager: cashiers only
        if (!canManage) return <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>—</span>;
        return (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            {/* reset password: owner only (SF-1102) */}
            {can(myRole, 'employee.reset') && <Button variant="ghost" size="sm" onClick={() => toast(`Reset link sent to ${e.name}`)}>Reset password</Button>}
            <Button variant={e.status === 'active' ? 'ghost' : 'primary'} size="sm" onClick={() => { toggleStatus(e.id); toast(`${e.name} ${e.status === 'active' ? 'deactivated' : 'activated'}`); }}>
              {e.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(e)}>Delete</Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Employees</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>
            {myRole === 'manager' ? 'Supervise staff — you can manage cashiers only.' : 'Manage staff, assign roles, and control access.'}
          </p>
        </div>
        {can(myRole, 'employee.manage') && <Button onClick={() => setOpen(true)}>+ Add employee</Button>}
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={employees} rowKey={(e) => e.id} emptyText="No staff yet." />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite employee">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Cole" />
        <Input label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@store.com" />
        <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Role</label>
        <select aria-label="New employee role" value={role} onChange={(e) => setNewRole(e.target.value as StaffRole)} style={{ width: '100%', padding: '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: 14, marginBottom: 16, background: 'var(--card)', color: 'var(--ink)' }}>
          <option value="cashier">Cashier</option>
          {myRole === 'owner' && <option value="manager">Manager</option>}
        </select>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submitInvite}>Send invite</Button>
        </div>
      </Modal>
    </>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
