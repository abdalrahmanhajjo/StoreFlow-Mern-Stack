import { useState, useMemo } from 'react';
import { useEmployees, type Employee, type StaffRole } from './employeesStore';
import { useSession } from '@/store/session';
import { can } from '@/lib/rbac';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal, Button, Badge, toast, confirm } from '@/components/ui';
import { PlanLimitBanner } from '@/components/access/PlanLimitBanner';

const ROLE_COLORS: Record<StaffRole, { bg: string; text: string }> = {
  owner: { bg: 'var(--amber-soft)', text: 'var(--amber)' },
  manager: { bg: 'var(--paper-dim)', text: 'var(--ink)' },
  cashier: { bg: 'var(--paper)', text: 'var(--ink-faint)' },
};
const ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'Owner', manager: 'Manager', cashier: 'Cashier',
};

export default function EmployeesPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const myRole = useSession((s) => s.user!.role);
  const { employees, invite, setRole, toggleStatus, remove } = useEmployees();

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>(myRole === 'manager' ? 'cashier' : 'manager');
  const [sending, setSending] = useState(false);

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const activeCount = employees.filter((e) => e.status === 'active').length;
  const disabledCount = employees.filter((e) => e.status === 'disabled').length;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return employees.filter((e) => {
      const matchQ = !term || e.name.toLowerCase().includes(term) || e.email.toLowerCase().includes(term);
      const matchR = roleFilter === 'all' || e.role === roleFilter;
      return matchQ && matchR;
    });
  }, [employees, query, roleFilter]);

  const openNew = () => {
    setName(''); setEmail(''); setNewRole(myRole === 'manager' ? 'cashier' : 'manager'); setSending(false); setFormOpen(true);
  };

  const submitInvite = () => {
    if (sending) return;
    if (name.trim().length < 2) return toast('Enter a name');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Enter a valid email');
    setSending(true);
    const res = invite(name, email, newRole);
    if (!res.ok) { setSending(false); return toast(res.error ?? 'Could not add'); }
    toast(`Invite sent to ${email}`);
    setFormOpen(false); setName(''); setEmail('');
  };

  const onDelete = async (e: Employee) => {
    if (e.role === 'owner') return;
    const ok = await confirm({ title: `Remove ${e.name}?`, message: `${e.name}'s account will be permanently removed.`, confirmLabel: 'Remove', danger: true });
    if (ok) {
      remove(e.id);
      toast(`${e.name} removed`);
    }
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Business</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Employees</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{employees.length} staff · {activeCount} active</p>
        </div>
        {can(myRole, 'employee.manage') && <Button onClick={openNew} style={{ width: isMobile ? '100%' : undefined }}>+ Add employee</Button>}
      </div>

      <PlanLimitBanner
        limitKey="membersPerStore"
        currentCount={activeCount}
        label="staff members"
      />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Total staff', value: employees.length, color: 'var(--ink)' },
          { label: 'Active', value: activeCount, color: 'var(--green)' },
          { label: 'Disabled', value: disabledCount, color: 'var(--red)' },
        ].map((s, i) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)', gridColumn: isMobile && i === 2 ? '1 / -1' : undefined }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + role filter */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: isMobile ? 'column' : 'row' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" style={{ padding: isMobile ? '11px 14px' : '9px 14px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : '1 1 200px' }} />
        <div style={{ display: 'flex', gap: 3, width: isMobile ? '100%' : undefined }}>
          {(['all', 'manager', 'cashier'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRoleFilter(r)} style={{ flex: isMobile ? 1 : undefined, padding: isMobile ? '10px 0' : '7px 14px', borderRadius: 8, fontSize: isMobile ? 13 : 12, fontWeight: 600, border: '1px solid var(--line)', cursor: 'pointer', background: roleFilter === r ? 'var(--ink)' : 'var(--card)', color: roleFilter === r ? 'var(--card)' : 'var(--ink-soft)' }}>
              {r === 'all' ? 'All' : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .sf-emp-card { transition: box-shadow .2s, transform .2s; }
        .sf-emp-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-emp-card-actions { opacity: 0; transition: opacity .15s; }
        .sf-emp-card:hover .sf-emp-card-actions,
        .sf-emp-card:focus-within .sf-emp-card-actions { opacity: 1; }
        @media (hover: none) { .sf-emp-card-actions { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sf-emp-card, .sf-emp-card-actions { transition: none; }
          .sf-emp-card:hover { transform: none; }
        }
      `}</style>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '48px 16px' : '64px 24px', textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p style={{ fontSize: isMobile ? 14 : 15, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
            {employees.length === 0 ? 'No staff yet' : 'No matches'}
          </p>
          <p style={{ fontSize: isMobile ? 12 : 13, color: 'var(--ink-faint)', margin: 0 }}>
            {employees.length === 0 ? 'Invite your first employee to start building your team.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 12 : 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {filtered.map((e) => {
              const colors = ROLE_COLORS[e.role];
              const initial = e.name.charAt(0).toUpperCase();
              const canManage = e.role !== 'owner' && can(myRole, 'employee.delete', e.role);
              return (
                <div key={e.id} className="sf-emp-card" style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                  <div style={{ padding: isMobile ? 14 : 16, paddingBottom: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, marginBottom: 10 }}>
                      <div style={{ width: isMobile ? 38 : 40, height: isMobile ? 38 : 40, borderRadius: 10, background: colors.bg, color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 15 : 16, fontWeight: 800, flexShrink: 0 }}>{initial}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: isMobile ? 14 : 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                        <div style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>
                          <span className="mono">{e.email}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      <Badge tone={e.role === 'owner' ? 'amber' : e.role === 'manager' ? 'blue' : 'grey'}>
                        {ROLE_LABEL[e.role]}
                      </Badge>
                      <Badge tone={e.status === 'active' ? 'green' : 'red'}>
                        {e.status === 'active' ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  {e.role === 'owner' ? (
                    <div style={{ borderTop: '1px solid var(--line-soft)', background: 'var(--paper)', padding: isMobile ? '10px 14px' : '6px 14px', marginTop: 8, fontSize: isMobile ? 12 : 11, color: 'var(--ink-faint)', fontWeight: 600, textAlign: 'center' }}>
                      Store owner
                    </div>
                  ) : canManage || can(myRole, 'employee.editRole', e.role) ? (
                    <div className="sf-emp-card-actions" style={{ display: 'flex', gap: 2, borderTop: '1px solid var(--line-soft)', background: 'var(--paper)', padding: isMobile ? '8px 10px' : '6px 8px', marginTop: 8 }}>
                      {/* Role select — manager limited to cashier role only */}
                      {can(myRole, 'employee.editRole', e.role) ? (
                        <select aria-label={`Role for ${e.name}`} value={e.role} onChange={(ev) => { setRole(e.id, ev.target.value as StaffRole); toast(`${e.name} is now ${ev.target.value}`); }}
                          style={{ flex: 1, padding: isMobile ? '8px 4px' : '6px 4px', fontSize: isMobile ? 13 : 11.5, fontWeight: 600, background: 'transparent', border: '1px solid var(--line)', borderRadius: 6, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}>
                          <option value="cashier">Cashier</option>
                          {myRole === 'owner' && <option value="manager">Manager</option>}
                        </select>
                      ) : null}

                      {/* Status toggle */}
                      {canManage && (
                        <button type="button" onClick={() => { toggleStatus(e.id); toast(`${e.name} ${e.status === 'active' ? 'deactivated' : 'activated'}`); }}
                          style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 13 : 11.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                          onMouseEnter={(e2) => e2.currentTarget.style.background = 'var(--paper-dim)'}
                          onMouseLeave={(e2) => e2.currentTarget.style.background = 'transparent'}
                        >
                          {e.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}

                      {/* Delete */}
                      {canManage && (
                        <button type="button" onClick={() => onDelete(e)}
                          style={{ flex: 1, padding: isMobile ? '10px 0' : '6px 0', fontSize: isMobile ? 13 : 11.5, fontWeight: 600, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--red)' }}
                          onMouseEnter={(e2) => e2.currentTarget.style.background = 'var(--red-soft)'}
                          onMouseLeave={(e2) => e2.currentTarget.style.background = 'transparent'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          Delete
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px solid var(--line-soft)', background: 'var(--paper)', padding: isMobile ? '10px 14px' : '6px 14px', marginTop: 8, fontSize: isMobile ? 12 : 11, color: 'var(--ink-faint)', fontWeight: 600, textAlign: 'center' }}>
                      {myRole === 'manager' ? 'Manager — restricted' : 'Staff'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Invite employee">
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Cole" style={{ width: '100%', padding: isMobile ? '12px 14px' : '11px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--card)' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Work email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@store.com" style={{ width: '100%', padding: isMobile ? '12px 14px' : '11px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--card)' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Role</label>
          <select aria-label="New employee role" value={newRole} onChange={(e) => setNewRole(e.target.value as StaffRole)} style={{ width: '100%', padding: isMobile ? '12px 14px' : '12px 13px', border: '1px solid var(--line)', borderRadius: 11, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, background: 'var(--card)', color: 'var(--ink)' }}>
            <option value="cashier">Cashier</option>
            {myRole === 'owner' && <option value="manager">Manager</option>}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setFormOpen(false)} style={{ flex: 1 }} disabled={sending}>Cancel</Button>
          <Button onClick={submitInvite} style={{ flex: 2 }} isLoading={sending}>Send invite</Button>
        </div>
      </Modal>
    </>
  );
}
