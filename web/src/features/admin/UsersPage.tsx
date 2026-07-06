import { useState, useMemo } from 'react';
import { usePlatformUsers, type PlatformUser } from './adminStore';
import { DataTable, Badge, Button, confirmDialog, toast, type Column } from '@/components/ui';

export default function UsersPage() {
  const { users, toggle, remove } = usePlatformUsers();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      const matchQ = !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
      const matchRole = role === 'all' || u.role === role;
      return matchQ && matchRole;
    });
  }, [users, q, role]);

  const onDelete = async (u: PlatformUser) => {
    if (await confirmDialog(`Delete ${u.name}? This removes their account.`)) {
      remove(u.id);
      toast(`${u.name} deleted`);
    }
  };

  const columns: Column<PlatformUser>[] = [
    { key: 'name', header: 'User', render: (u) => (
      <span><span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{u.name}</span><span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{u.email}</span></span>
    ) },
    { key: 'role', header: 'Role', render: (u) => <Badge tone={u.role === 'Platform admin' ? 'blue' : u.role === 'Owner' ? 'amber' : 'grey'}>{u.role}</Badge> },
    { key: 'store', header: 'Store', render: (u) => u.store === '—' ? <span style={{ color: 'var(--ink-faint)' }}>—</span> : u.store },
    { key: 'lastActive', header: 'Last active', render: (u) => <span className="mono">{u.lastActive}</span> },
    { key: 'status', header: 'Status', render: (u) => <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge> },
    { key: 'act', header: '', align: 'right', render: (u) => (
      u.root ? <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>root</span> : (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => toast(`Reset link sent to ${u.name}`)}>Reset password</Button>
          <Button variant={u.status === 'active' ? 'ghost' : 'primary'} size="sm" onClick={() => { toggle(u.id); toast(`${u.name} ${u.status === 'active' ? 'disabled' : 'enabled'}`); }}>{u.status === 'active' ? 'Disable' : 'Enable'}</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(u)}>Delete</Button>
        </div>
      )
    ) },
  ];

  const selStyle: React.CSSProperties = { padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, background: '#fff', fontFamily: 'inherit', color: 'var(--ink)' };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Platform</div>
          <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>All users</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>Every account across all stores. Store users can never see beyond their own tenant.</p>
        </div>
        <Button variant="ghost" onClick={() => toast('User list exported (CSV)')}>⤓ Export</Button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email…" style={{ ...selStyle, width: 240 }} />
        <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)} style={selStyle}>
          <option value="all">All roles</option><option>Platform admin</option><option>Owner</option><option>Manager</option><option>Cashier</option>
        </select>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={rows} rowKey={(u) => u.id} emptyText="No users match." />
      </div>
    </>
  );
}
