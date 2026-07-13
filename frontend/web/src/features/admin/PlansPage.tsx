import { useState, useEffect } from 'react';
import { usePlans } from './planStore';
import type { Plan, PlanInput, PlanLimits, PlanFeatures } from './planService';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge, Button, confirmDialog, toast } from '@/components/ui';

type RowDef =
  | { kind: 'limit'; key: keyof PlanLimits; label: string }
  | { kind: 'feature'; key: keyof PlanFeatures; label: string };

const ROWS: RowDef[] = [
  { kind: 'limit', key: 'productLimit', label: 'Product limit' },
  { kind: 'limit', key: 'staffAccounts', label: 'Staff accounts' },
  { kind: 'feature', key: 'suppliersAndPurchaseOrders', label: 'Suppliers & purchase orders' },
  { kind: 'feature', key: 'fullReporting', label: 'Full reporting' },
  { kind: 'feature', key: 'advancedAnalytics', label: 'Advanced analytics' },
  { kind: 'feature', key: 'multiBranch', label: 'Multi-branch' },
  { kind: 'feature', key: 'prioritySupport', label: 'Priority support' },
];

const EMPTY_LIMITS: PlanLimits = { productLimit: null, staffAccounts: null };
const EMPTY_FEATURES: PlanFeatures = {
  suppliersAndPurchaseOrders: false,
  fullReporting: false,
  advancedAnalytics: false,
  multiBranch: false,
  prioritySupport: false,
};

const slugify = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface DraftPlan { name: string; priceMonthly: number; description: string }

export default function PlansPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { plans, stores, loading, loaded, load, createPlan, updatePlan, deletePlan, assignPlan } = usePlans();

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftPlan | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPlan, setNewPlan] = useState<DraftPlan>({ name: '', priceMonthly: 0, description: '' });
  const [savingId, setSavingId] = useState<string | null>(null);

  const [matrixEdit, setMatrixEdit] = useState(false);
  const [draftMatrix, setDraftMatrix] = useState<Record<string, { limits: PlanLimits; features: PlanFeatures }>>({});
  const [matrixSaving, setMatrixSaving] = useState(false);

  const startEdit = (p: Plan) => {
    setEditing(p._id);
    setDraft({ name: p.name, priceMonthly: p.priceMonthly, description: p.description });
  };
  const cancelEdit = () => { setEditing(null); setDraft(null); };

  const saveEdit = async (p: Plan) => {
    if (!draft) return;
    if (draft.name.trim().length < 2) return toast('Enter a plan name');
    if (draft.priceMonthly < 0) return toast('Price cannot be negative');
    if (draft.description.trim().length < 5) return toast('Description too short');

    setSavingId(p._id);
    const res = await updatePlan(p._id, {
      name: draft.name.trim(),
      priceMonthly: draft.priceMonthly,
      description: draft.description.trim(),
    });
    setSavingId(null);
    if (!res.ok) return toast(res.error ?? 'Could not update plan');
    toast(`${draft.name} plan updated`);
    setEditing(null); setDraft(null);
  };

  const startAdd = () => { setAdding(true); setNewPlan({ name: '', priceMonthly: 0, description: '' }); };
  const cancelAdd = () => { setAdding(false); setNewPlan({ name: '', priceMonthly: 0, description: '' }); };

  const saveNew = async () => {
    const name = newPlan.name.trim();
    if (!name) return toast('Enter a plan name');
    if (plans.some((p) => p.name.toLowerCase() === name.toLowerCase())) return toast('Plan name already exists');
    if (newPlan.priceMonthly < 0) return toast('Price cannot be negative');
    if (newPlan.description.trim().length < 5) return toast('Description too short');

    const input: PlanInput = {
      name,
      slug: slugify(name),
      priceMonthly: newPlan.priceMonthly,
      description: newPlan.description.trim(),
      isPopular: false,
      isActive: true,
      limits: EMPTY_LIMITS,
      features: EMPTY_FEATURES,
      displayOrder: plans.length,
    };
    const res = await createPlan(input);
    if (!res.ok) return toast(res.error ?? 'Could not create plan');
    toast(`${name} plan added`);
    setAdding(false);
    setNewPlan({ name: '', priceMonthly: 0, description: '' });
  };

  const onDeletePlan = async (p: Plan) => {
    if (p.storeCount > 0) return toast(`Cannot delete — ${p.storeCount} store${p.storeCount !== 1 ? 's' : ''} on this plan`);
    if (!(await confirmDialog(`Delete the "${p.name}" plan? This cannot be undone.`))) return;
    const res = await deletePlan(p._id);
    if (!res.ok) return toast(res.error ?? 'Could not delete plan');
    if (editing === p._id) { setEditing(null); setDraft(null); }
    toast(`${p.name} plan deleted`);
  };

  const startMatrixEdit = () => {
    const draft: Record<string, { limits: PlanLimits; features: PlanFeatures }> = {};
    plans.forEach((p) => { draft[p._id] = { limits: { ...p.limits }, features: { ...p.features } }; });
    setDraftMatrix(draft);
    setMatrixEdit(true);
  };

  const saveMatrix = async () => {
    setMatrixSaving(true);
    const results = await Promise.all(
      plans.map((p) => updatePlan(p._id, { limits: draftMatrix[p._id].limits, features: draftMatrix[p._id].features }))
    );
    setMatrixSaving(false);
    const failed = results.filter((r) => !r.ok);
    if (failed.length) return toast(`${failed.length} plan(s) failed to save`);
    toast('Matrix saved');
    setMatrixEdit(false);
  };

  const setDraftLimit = (planId: string, key: keyof PlanLimits, raw: string) => {
    const trimmed = raw.trim();
    const value = trimmed === '' || /unlimited/i.test(trimmed) || Number.isNaN(Number(trimmed))
      ? null
      : Math.max(0, parseInt(trimmed, 10));
    setDraftMatrix((prev) => ({ ...prev, [planId]: { ...prev[planId], limits: { ...prev[planId].limits, [key]: value } } }));
  };

  const setDraftFeature = (planId: string, key: keyof PlanFeatures, value: boolean) => {
    setDraftMatrix((prev) => ({ ...prev, [planId]: { ...prev[planId], features: { ...prev[planId].features, [key]: value } } }));
  };

  const cellDisplay = (p: Plan, row: RowDef) => {
    if (row.kind === 'limit') {
      const v = p.limits[row.key];
      return v === null
        ? <span style={{ color: 'var(--ink-soft)' }}>Unlimited</span>
        : <span style={{ color: 'var(--ink-soft)' }}>{v}</span>;
    }
    return p.features[row.key]
      ? <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span>
      : <span style={{ color: 'var(--ink-faint)' }}>—</span>;
  };

  const badgeTone = (status: 'pending' | 'active' | 'suspended') =>
    status === 'active' ? 'green' : status === 'suspended' ? 'red' : 'amber';

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

      {loading && !loaded ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-faint)' }}>Loading plans…</div>
      ) : (
        <>
          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 12 : 18, marginBottom: isMobile ? 14 : 18 }}>
            {plans.map((p) => {
              const isEdit = editing === p._id;
              const canDelete = p.storeCount === 0;
              return (
                <div key={p._id} className="sf-plan-card" style={{ background: 'var(--card)', border: p.isPopular ? '1.5px solid var(--amber)' : '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? 16 : 20, boxShadow: p.isPopular ? '0 0 0 2px rgba(217,119,6,.1)' : 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
                  {p.isPopular && (
                    <div style={{ position: 'absolute', top: 12, right: -28, background: 'var(--amber)', color: 'var(--card)', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', padding: '3px 32px', transform: 'rotate(45deg)' }}>
                      Popular
                    </div>
                  )}
                  <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: p.isPopular ? 'var(--amber)' : 'var(--ink-faint)', fontWeight: 700, marginBottom: 4 }}>{p.name}</div>

                  {isEdit && draft ? (
                    <>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-faint)', marginBottom: 4 }}>Plan name</label>
                      <input aria-label="Plan name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, fontWeight: 700, color: 'var(--ink)', background: 'var(--paper)', marginBottom: 8 }} />
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--ink-faint)', marginBottom: 4 }}>Price (USD/mo)</label>
                      <input aria-label="Price" type="number" min={0} value={draft.priceMonthly} onChange={(e) => setDraft({ ...draft, priceMonthly: Number(e.target.value) })}
                        style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 28 : 24, fontWeight: 800, color: 'var(--ink)', background: 'var(--paper)', marginBottom: 8 }} />
                      <textarea aria-label="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2}
                        style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 13, color: 'var(--ink-soft)', background: 'var(--paper)', marginBottom: 10, resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button size="sm" onClick={() => saveEdit(p)} isLoading={savingId === p._id} style={{ flex: 1, justifyContent: 'center' }}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="display mono" style={{ fontSize: isMobile ? 28 : 30, fontWeight: 800, color: 'var(--ink)' }}>${p.priceMonthly}<span style={{ fontSize: isMobile ? 12 : 13, color: 'var(--ink-faint)', fontWeight: 500 }}>/mo</span></div>
                      <p style={{ color: 'var(--ink-soft)', margin: isMobile ? '8px 0 12px' : '8px 0 14px', fontSize: isMobile ? 12.5 : 13 }}>{p.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-faint)' }}><b style={{ color: 'var(--ink)' }}>{p.storeCount}</b> store{p.storeCount !== 1 ? 's' : ''} on this plan</span>
                        <button type="button" onClick={() => startEdit(p)}
                          style={{ padding: isMobile ? '8px 14px' : '5px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', fontSize: isMobile ? 12.5 : 11.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >✎ Edit</button>
                      </div>
                      <button type="button" onClick={() => onDeletePlan(p)} disabled={!canDelete}
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
                <input aria-label="Plan name" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="Plan name"
                  style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, fontWeight: 700, color: 'var(--ink)', background: 'var(--paper)', marginBottom: 8 }} />
                <input aria-label="Price" type="number" min={0} value={newPlan.priceMonthly} onChange={(e) => setNewPlan({ ...newPlan, priceMonthly: Number(e.target.value) })} placeholder="0"
                  style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 28 : 24, fontWeight: 800, color: 'var(--ink)', background: 'var(--paper)', marginBottom: 8 }} />
                <textarea aria-label="Description" value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} placeholder="Describe what this plan includes…" rows={2}
                  style={{ width: '100%', padding: isMobile ? '10px 10px' : '8px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 13, color: 'var(--ink-soft)', background: 'var(--paper)', marginBottom: 10, resize: 'vertical' }} />
                <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '0 0 10px' }}>Feature limits are off by default — set them below in the matrix after creating.</p>
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
                    <button type="button" onClick={saveMatrix} disabled={matrixSaving}
                      style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--ink)', color: 'var(--card)', fontSize: 11, fontWeight: 700, cursor: matrixSaving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: matrixSaving ? .6 : 1 }}>{matrixSaving ? 'Saving…' : 'Save'}</button>
                    <button type="button" onClick={() => setMatrixEdit(false)}
                      style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={startMatrixEdit}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper-dim)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >✎ Edit</button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${plans.length}, 70px)`, gap: isMobile ? 4 : 8, padding: isMobile ? '8px 12px' : '10px 16px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: isMobile ? 10.5 : 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                <span>Feature</span>
                {plans.map((p) => <span key={p._id} style={{ textAlign: 'center' }}>{p.name}</span>)}
              </div>
              <div style={{ padding: isMobile ? 4 : 0 }}>
                {ROWS.map((row, i) => (
                  <div key={row.key} className="sf-matrix-row" style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${plans.length}, 70px)`, gap: isMobile ? 4 : 8, padding: isMobile ? '11px 12px' : '12px 16px', borderBottom: i < ROWS.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{row.label}</span>
                    {plans.map((p) => (
                      <span key={p._id} style={{ textAlign: 'center' }}>
                        {matrixEdit ? (
                          row.kind === 'limit' ? (
                            <input
                              aria-label={`${row.label} for ${p.name}`}
                              defaultValue={draftMatrix[p._id]?.limits[row.key] ?? 'Unlimited'}
                              onChange={(e) => setDraftLimit(p._id, row.key, e.target.value)}
                              placeholder="Unlimited"
                              style={{ width: '100%', padding: '4px 4px', border: '1px solid var(--line)', borderRadius: 4, fontFamily: 'inherit', fontSize: isMobile ? 16 : 12, color: 'var(--ink)', background: 'var(--card)', textAlign: 'center' }}
                            />
                          ) : (
                            <input
                              type="checkbox"
                              aria-label={`${row.label} for ${p.name}`}
                              checked={draftMatrix[p._id]?.features[row.key] ?? false}
                              onChange={(e) => setDraftFeature(p._id, row.key, e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--blue)' }}
                            />
                          )
                        ) : (
                          cellDisplay(p, row)
                        )}
                      </span>
                    ))}
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
                {stores.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>No stores registered.</div>
                ) : (
                  stores.map((s, i) => (
                    <div key={s.id} className="sf-assign-row" style={{ display: 'grid', gridTemplateColumns: '1fr 60px auto', gap: 8, padding: isMobile ? '11px 12px' : '12px 16px', borderBottom: i < stores.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                      <span style={{ textAlign: 'center' }}><Badge tone={badgeTone(s.status)}>{s.status[0].toUpperCase() + s.status.slice(1)}</Badge></span>
                      <select aria-label={`Plan for ${s.name}`} value={s.planId ?? ''} onChange={async (e) => {
                          const planId = e.target.value;
                          if (!planId) return;
                          const res = await assignPlan(s.id, planId);
                          if (!res.ok) return toast(res.error ?? 'Could not assign plan');
                          toast(`${s.name} moved to ${plans.find((p) => p._id === planId)?.name ?? 'plan'}`);
                        }}
                        style={{ width: '100%', padding: isMobile ? '10px 8px' : '6px 8px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 12.5, background: 'var(--card)', color: 'var(--ink)' }}>
                        <option value="" disabled>Unassigned</option>
                        {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}