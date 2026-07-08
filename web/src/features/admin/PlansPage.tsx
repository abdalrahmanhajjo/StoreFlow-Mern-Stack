import { useState, useMemo } from 'react';
import { useTenants } from './adminStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge, Button, confirmDialog, toast } from '@/components/ui';

interface PlanDef {
  key: string;
  price: string;
  blurb: string;
}

const PLANS_INIT: PlanDef[] = [
  { key: 'Free', price: '$0', blurb: '1 staff, 1 register, up to 50 products. Core POS only.' },
  { key: 'Pro', price: '$49', blurb: 'Up to 10 staff, suppliers, purchase orders, full reporting.' },
  { key: 'Enterprise', price: '$99', blurb: 'Unlimited staff, advanced analytics, multi-branch, priority support.' },
];

const MATRIX: { feature: string; free: string; pro: string; ent: string }[] = [
  { feature: 'Product limit', free: '50', pro: 'Unlimited', ent: 'Unlimited' },
  { feature: 'Staff accounts', free: '1', pro: '10', ent: 'Unlimited' },
  { feature: 'Suppliers & purchase orders', free: '—', pro: '✓', ent: '✓' },
  { feature: 'Advanced analytics', free: '—', pro: '—', ent: '✓' },
  { feature: 'Multi-branch', free: '—', pro: '—', ent: '✓' },
  { feature: 'Priority support', free: '—', pro: '—', ent: '✓' },
];

const cellVal = (v: string) =>
  v === '✓' ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span> :
  v === '—' ? <span style={{ color: 'var(--ink-faint)' }}>—</span> :
  <span style={{ color: 'var(--ink-soft)' }}>{v}</span>;

export default function PlansPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { tenants, setPlan } = useTenants();
  const [plans, setPlans] = useState<PlanDef[]>(PLANS_INIT);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<PlanDef | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPlan, setNewPlan] = useState<PlanDef>({ key: '', price: '$', blurb: '' });
  const [matrix, setMatrix] = useState(MATRIX);
  const [matrixEdit, setMatrixEdit] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    plans.forEach((p) => { c[p.key] = 0; });
    tenants.forEach((t) => { if (c[t.plan] !== undefined) c[t.plan] += 1; });
    return c;
  }, [plans, tenants]);

  const startEdit = (p: PlanDef) => {
    setEditing(p.key);
    setDraft({ ...p });
  };

  const startAdd = () => {
    setAdding(true);
    setNewPlan({ key: '', price: '$', blurb: '' });
  };

  const saveNew = () => {
    const k = newPlan.key.trim();
    if (!k) return toast('Enter a plan name');
    if (plans.some((p) => p.key.toLowerCase() === k.toLowerCase())) return toast('Plan name already exists');
    if (!newPlan.price.startsWith('$')) return toast('Price must start with $');
    if (newPlan.blurb.trim().length < 5) return toast('Description too short');
    setPlans((prev) => [...prev, { ...newPlan, key: k }]);
    toast(`${k} plan added`);
    setAdding(false);
    setNewPlan({ key: '', price: '$', blurb: '' });
  };

  const cancelAdd = () => {
    setAdding(false);
    setNewPlan({ key: '', price: '$', blurb: '' });
  };

  const deletePlan = async (p: PlanDef) => {
    if (counts[p.key] > 0) return toast(`Cannot delete — ${counts[p.key]} store${counts[p.key] !== 1 ? 's' : ''} on this plan`);
    if (p.key === 'Free' || p.key === 'Pro' || p.key === 'Enterprise') {
      if (!await confirmDialog(`Delete the "${p.key}" plan? This cannot be undone.`)) return;
    }
    setPlans((prev) => prev.filter((x) => x.key !== p.key));
    if (editing === p.key) { setEditing(null); setDraft(null); }
    toast(`${p.key} plan deleted`);
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!draft) return;
    if (!draft.price.startsWith('$')) return toast('Price must start with $');
    if (draft.blurb.trim().length < 5) return toast('Description too short');
    setPlans((prev) => prev.map((p) => (p.key === draft.key ? { ...draft } : p)));
    toast(`${draft.key} plan updated`);
    setEditing(null);
    setDraft(null);
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Platform · business layer</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Subscription plans</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>Control feature access and store limits per plan.</p>
        </div>
        <Button onClick={startAdd} style={{ width: isMobile ? '100%' : undefined, justifyContent: 'center' }}>+ Add plan</Button>
      </div>

      <style>{`
        .sf-plan-card { transition: box-shadow .2s, transform .2s; }
        .sf-plan-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-matrix-row { transition: background .12s; }
        .sf-matrix-row:hover { background: var(--paper); }
        .sf-assign-row { transition: background .12s; }
        .sf-assign-row:hover { background: var(--paper); }
        @media (prefers-reduced-motion: reduce) {
          .sf-plan-card, .sf-matrix-row, .sf-assign-row { transition: none; }
          .sf-plan-card:hover { transform: none; }
        }
      `}</style>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 18, marginBottom: isMobile ? 14 : 18 }}>
        {plans.map((p) => {
          const isEdit = editing === p.key;
          const isPopular = p.key.toLowerCase() === 'pro';
          const canDelete = counts[p.key] === 0;
          return (
            <div key={p.key} className="sf-plan-card" style={{ background: 'var(--card)', border: isPopular ? '1.5px solid var(--amber)' : '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? 16 : 20, boxShadow: isPopular ? '0 0 0 2px rgba(217,119,6,.1)' : 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
              {isPopular && (
                <div style={{ position: 'absolute', top: 12, right: -28, background: 'var(--amber)', color: '#fff', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', padding: '3px 32px', transform: 'rotate(45deg)' }}>
                  Popular
                </div>
              )}
              <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: isPopular ? 'var(--amber)' : 'var(--ink-faint)', fontWeight: 700, marginBottom: 4 }}>{p.key}</div>

              {isEdit && draft ? (
                <>
                  <input aria-label="Price" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 28 : 24, fontWeight: 800, color: 'var(--ink)', background: 'var(--paper)', marginBottom: 8 }} />
                  <textarea aria-label="Description" value={draft.blurb} onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} rows={2}
                    style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 13, color: 'var(--ink-soft)', background: 'var(--paper)', marginBottom: 10, resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" onClick={saveEdit} style={{ flex: 1, justifyContent: 'center' }}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={cancelEdit} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="display mono" style={{ fontSize: isMobile ? 28 : 30, fontWeight: 800, color: 'var(--ink)' }}>{p.price}<span style={{ fontSize: isMobile ? 12 : 13, color: 'var(--ink-faint)', fontWeight: 500 }}>/mo</span></div>
                  <p style={{ color: 'var(--ink-soft)', margin: isMobile ? '8px 0 12px' : '8px 0 14px', fontSize: isMobile ? 12.5 : 13 }}>{p.blurb}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-faint)' }}><b style={{ color: 'var(--ink)' }}>{counts[p.key] ?? 0}</b> store{(counts[p.key] ?? 0) !== 1 ? 's' : ''} on this plan</span>
                    <button type="button" onClick={() => startEdit(p)}
                      style={{ padding: isMobile ? '8px 14px' : '5px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', fontSize: isMobile ? 12.5 : 11.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >✎ Edit</button>
                  </div>
                  <button type="button" onClick={() => deletePlan(p)} disabled={!canDelete}
                    style={{ width: '100%', padding: isMobile ? '8px 0' : '6px 0', borderRadius: 6, border: '1px solid var(--red)', background: 'transparent', fontSize: isMobile ? 12.5 : 12, fontWeight: 600, cursor: canDelete ? 'pointer' : 'not-allowed', color: canDelete ? 'var(--red)' : 'var(--ink-faint)', fontFamily: 'inherit', opacity: canDelete ? 1 : .4 }}
                    onMouseEnter={(e) => { if (canDelete) e.currentTarget.style.background = 'var(--red-soft)'; }}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: 'middle' }}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    Delete plan
                  </button>
                </>
              )}
            </div>
          );
        })}

        {/* New plan card */}
        {adding && (
          <div className="sf-plan-card" style={{ background: 'var(--card)', border: '1.5px dashed var(--blue)', borderRadius: 'var(--radius)', padding: isMobile ? 16 : 20, boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 700, marginBottom: 4 }}>New plan</div>
            <input aria-label="Plan name" value={newPlan.key} onChange={(e) => setNewPlan({ ...newPlan, key: e.target.value })} placeholder="Plan name"
              style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, fontWeight: 700, color: 'var(--ink)', background: 'var(--paper)', marginBottom: 8 }} />
            <input aria-label="Price" value={newPlan.price} onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })} placeholder="$"
              style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 28 : 24, fontWeight: 800, color: 'var(--ink)', background: 'var(--paper)', marginBottom: 8 }} />
            <textarea aria-label="Description" value={newPlan.blurb} onChange={(e) => setNewPlan({ ...newPlan, blurb: e.target.value })} placeholder="Describe what this plan includes…" rows={2}
              style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 13, color: 'var(--ink-soft)', background: 'var(--paper)', marginBottom: 10, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" onClick={saveNew} style={{ flex: 1, justifyContent: 'center' }}>Create</Button>
              <Button variant="ghost" size="sm" onClick={cancelAdd} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Feature matrix + Assign plan */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap: isMobile ? 14 : 18 }}>

        {/* Feature matrix */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Feature access matrix</h3>
            {matrixEdit ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => { setMatrixEdit(false); toast('Matrix saved'); }}
                  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                <button type="button" onClick={() => { setMatrix(MATRIX); setMatrixEdit(false); }}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setMatrixEdit(true)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >✎ Edit</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px auto', gap: isMobile ? 4 : 8, padding: isMobile ? '8px 12px' : '10px 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: isMobile ? 10.5 : 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <span>Feature</span><span style={{ textAlign: 'center' }}>Free</span><span style={{ textAlign: 'center' }}>Pro</span><span style={{ textAlign: 'center' }}>Enterprise</span>
          </div>
          <div style={{ padding: isMobile ? 4 : 0 }}>
            {matrix.map((r, i) => (
              <div key={r.feature} className="sf-matrix-row" style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px auto', gap: isMobile ? 4 : 8, padding: isMobile ? '11px 12px' : '12px 16px', borderBottom: i < matrix.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: isMobile ? 13 : 13 }}>{r.feature}</span>
                {matrixEdit ? (
                  <>
                    <input aria-label={`${r.feature} Free value`} value={r.free} onChange={(e) => setMatrix((prev) => prev.map((x, j) => j === i ? { ...x, free: e.target.value } : x))}
                      style={{ width: '100%', padding: '4px 4px', border: '1px solid var(--line)', borderRadius: 4, fontFamily: 'inherit', fontSize: isMobile ? 16 : 12, color: 'var(--ink)', background: 'var(--card)', textAlign: 'center' }} />
                    <input aria-label={`${r.feature} Pro value`} value={r.pro} onChange={(e) => setMatrix((prev) => prev.map((x, j) => j === i ? { ...x, pro: e.target.value } : x))}
                      style={{ width: '100%', padding: '4px 4px', border: '1px solid var(--line)', borderRadius: 4, fontFamily: 'inherit', fontSize: isMobile ? 16 : 12, color: 'var(--ink)', background: 'var(--card)', textAlign: 'center' }} />
                    <input aria-label={`${r.feature} Enterprise value`} value={r.ent} onChange={(e) => setMatrix((prev) => prev.map((x, j) => j === i ? { ...x, ent: e.target.value } : x))}
                      style={{ width: '100%', padding: '4px 4px', border: '1px solid var(--line)', borderRadius: 4, fontFamily: 'inherit', fontSize: isMobile ? 16 : 12, color: 'var(--ink)', background: 'var(--card)', textAlign: 'center' }} />
                  </>
                ) : (
                  <>
                    <span style={{ textAlign: 'center', fontSize: isMobile ? 13 : 13 }}>{cellVal(r.free)}</span>
                    <span style={{ textAlign: 'center', fontSize: isMobile ? 13 : 13 }}>{cellVal(r.pro)}</span>
                    <span style={{ textAlign: 'center', fontSize: isMobile ? 13 : 13 }}>{cellVal(r.ent)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assign plan to store */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 15, color: 'var(--ink)' }}>Assign plan to store</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px auto', gap: 8, padding: isMobile ? '8px 12px' : '10px 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: isMobile ? 10.5 : 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <span>Store</span><span style={{ textAlign: 'center' }}>Status</span><span style={{ textAlign: 'center' }}>Plan</span>
          </div>
          <div style={{ padding: isMobile ? 4 : 0 }}>
            {tenants.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>No stores registered.</div>
            ) : (
              tenants.map((t, i) => (
                <div key={t.id} className="sf-assign-row" style={{ display: 'grid', gridTemplateColumns: '1fr 60px auto', gap: 8, padding: isMobile ? '11px 12px' : '12px 16px', borderBottom: i < tenants.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: isMobile ? 13 : 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                  <span style={{ textAlign: 'center' }}><Badge tone={t.status === 'active' ? 'green' : 'red'}>{t.status === 'active' ? 'Active' : 'Suspended'}</Badge></span>
                  <select aria-label={`Plan for ${t.name}`} value={t.plan} onChange={(e) => { setPlan(t.id, e.target.value as any); toast(`${t.name} moved to ${e.target.value}`); }}
                    style={{ width: '100%', padding: isMobile ? '10px 8px' : '6px 8px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 12.5, background: 'var(--card)', color: 'var(--ink)' }}>
                    {plans.map((x) => <option key={x.key}>{x.key}</option>)}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
