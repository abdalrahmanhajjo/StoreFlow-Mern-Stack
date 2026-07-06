import { useApprovals, type Application } from './adminStore';
import { DataTable, Badge, Button, confirmDialog, toast, type Column } from '@/components/ui';

export default function ApprovalsPage() {
  const { applications, approve, reject } = useApprovals();

  const onApprove = (a: Application) => {
    approve(a.id);
    toast(`${a.name} approved — workspace provisioned`);
  };
  const onReject = async (a: Application) => {
    if (await confirmDialog(`Reject the application from "${a.name}"?`)) {
      reject(a.id);
      toast(`${a.name} application rejected`);
    }
  };

  const columns: Column<Application>[] = [
    { key: 'name', header: 'Applicant store', render: (a) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: a.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{a.initials}</span>
        <span>
          <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{a.name}</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{a.email}{a.flagged && <Badge tone="red">flagged</Badge>}</span>
        </span>
      </span>
    ) },
    { key: 'type', header: 'Type' },
    { key: 'plan', header: 'Plan requested', render: (a) => <Badge tone={a.plan === 'Free' ? 'grey' : 'amber'}>{a.plan}</Badge> },
    { key: 'submitted', header: 'Submitted', render: (a) => <span className="mono">{a.submitted}</span> },
    { key: 'act', header: '', align: 'right', render: (a) => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <Button size="sm" onClick={() => onApprove(a)}>Approve</Button>
        <Button variant="danger" size="sm" onClick={() => onReject(a)}>Reject</Button>
      </div>
    ) },
  ];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 6 }}>Platform</div>
        <h2 className="display" style={{ fontSize: 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Store approvals</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 13 }}>New store registrations awaiting review before activation.</p>
      </div>

      {applications.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFF8EC', color: '#B45309', border: '1px solid #FBE3B3', padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 18, fontWeight: 500 }}>
          <b>{applications.length} store{applications.length > 1 ? 's' : ''}</b> pending review. Approve to provision an isolated workspace, or reject the application.
        </div>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <DataTable columns={columns} data={applications} rowKey={(a) => a.id} emptyText="Queue is clear — no pending applications." />
      </div>
    </>
  );
}
