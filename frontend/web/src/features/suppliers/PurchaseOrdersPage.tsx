import { useState, useMemo } from 'react';
import { useSupply, type PurchaseOrder, type POLine } from './supplyStore';
import { useProducts } from '@/features/products/productsStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Modal, Button, Badge, toast, confirmDialog } from '@/components/ui';

export default function PurchaseOrdersPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { suppliers, purchaseOrders, createPO, removePO, receivePO } = useSupply();
  const products = useProducts((s) => s.products);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received'>('all');
  const [formOpen, setFormOpen] = useState(false);

  const [poSupplier, setPoSupplier] = useState('');
  const [poExpected, setPoExpected] = useState('');
  const [poLines, setPoLines] = useState<POLine[]>([]);
  const [prodQuery, setProdQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return purchaseOrders.filter((p) => {
      const matchQ = !q || p.poNo.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || p.status === statusFilter;
      return matchQ && matchS;
    });
  }, [purchaseOrders, query, statusFilter]);

  const lowStock = useMemo(() =>
    products.filter((p) => p.stock <= p.reorderPoint),
    [products]
  );

  const searchableProducts = useMemo(() => {
    const q = prodQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || p.sku.includes(q)
    ).slice(0, 12);
  }, [products, prodQuery]);

  const openForm = () => {
    setPoSupplier(suppliers[0]?.name ?? '');
    setPoExpected('');
    setPoLines([]);
    setProdQuery('');
    setFormOpen(true);
  };

  const prefillLowStock = () => {
    const lines: POLine[] = lowStock.map((p) => ({
      productId: p.id,
      name: p.name,
      qty: Math.max(p.reorderPoint * 2 - p.stock, p.reorderPoint),
    }));
    setPoLines(lines);
    toast(`${lines.length} low-stock product${lines.length !== 1 ? 's' : ''} added`);
  };

  const addLine = (p: typeof products[number]) => {
    if (poLines.some((l) => l.productId === p.id)) return toast(`${p.name} already in list`);
    setPoLines((prev) => [...prev, { productId: p.id, name: p.name, qty: 1 }]);
    setProdQuery('');
  };

  const removeLine = (productId: string) => {
    setPoLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const changeQty = (productId: string, qty: number) => {
    setPoLines((prev) => prev.map((l) => l.productId === productId ? { ...l, qty: Math.max(1, qty) } : l));
  };

  const submitPO = () => {
    if (!poSupplier) return toast('Select a supplier');
    if (poLines.length === 0) return toast('Add at least one product');
    const res = createPO(poSupplier, poLines, poExpected || 'TBD');
    if (!res.ok) return toast(res.error ?? 'Could not create PO');
    toast(`Purchase order created for ${poSupplier}`);
    setFormOpen(false);
  };

  const onReceive = async (po: PurchaseOrder) => {
    const total = po.lines.reduce((n, l) => n + l.qty, 0);
    if (!await confirmDialog(`Receive ${po.poNo} from ${po.supplier}?\n${po.lines.length} product(s), ${total} units will be added to stock.`)) return;
    const added = receivePO(po.id);
    toast(`${po.poNo} received — ${added} units added to stock`);
  };

  const onDeletePO = async (po: PurchaseOrder) => {
    if (po.status === 'received') return toast('Cannot delete a received PO');
    if (!await confirmDialog(`Delete ${po.poNo}?`)) return;
    removePO(po.id);
    toast(`${po.poNo} deleted`);
  };

  return (
    <>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end',
        marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row',
      }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: 4 }}>Relationships</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Purchase orders</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{purchaseOrders.length} orders · {purchaseOrders.filter((p) => p.status === 'pending').length} pending</p>
        </div>
        <Button onClick={openForm} style={{ width: isMobile ? '100%' : undefined }}>+ New purchase order</Button>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 12 : 16, flexDirection: isMobile ? 'column' : 'row' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search PO # or supplier…" style={{ padding: isMobile ? '11px 14px' : '9px 14px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--card)', width: isMobile ? '100%' : undefined, flex: isMobile ? undefined : '1 1 200px' }} />
        <div style={{ display: 'flex', gap: 3, width: isMobile ? '100%' : undefined }}>
          {(['all', 'pending', 'received'] as const).map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)} style={{ flex: isMobile ? 1 : undefined, padding: isMobile ? '10px 0' : '7px 14px', borderRadius: 8, fontSize: isMobile ? 13 : 12, fontWeight: 600, border: '1px solid var(--line)', cursor: 'pointer', background: statusFilter === s ? 'var(--ink)' : 'var(--card)', color: statusFilter === s ? 'var(--card)' : 'var(--ink-soft)' }}>
              {s === 'all' ? 'All' : s === 'pending' ? 'Pending' : 'Received'}
            </button>
          ))}
        </div>
      </div>

      {/* Table / Cards */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: isMobile ? '36px 16px' : '48px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              {purchaseOrders.length === 0 ? 'No purchase orders yet' : 'No matches'}
            </p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>
              {purchaseOrders.length === 0 ? 'Create a PO to replenish stock.' : 'Try a different search or filter.'}
            </p>
          </div>
        ) : isMobile ? (
          /* Mobile: card layout */
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((po) => (
              <div key={po.id} style={{ background: 'var(--paper)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)', marginBottom: 2 }}>{po.poNo}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{po.supplier}</div>
                  </div>
                  <Badge tone={po.status === 'received' ? 'green' : 'amber'}>
                    {po.status === 'received' ? '✓ Received' : 'Pending'}
                  </Badge>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: 12, color: 'var(--ink-soft)' }}>
                  <span>{po.lines.reduce((n, l) => n + l.qty, 0)} units</span>
                  <span>Ordered {po.ordered}</span>
                  {po.expected !== 'TBD' && <span>Due {po.expected}</span>}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  {po.status === 'pending' ? (
                    <>
                      <button type="button" onClick={() => onReceive(po)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--green)', background: 'var(--green-soft)', color: 'var(--green)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Receive</button>
                      <button type="button" onClick={() => onDeletePO(po)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-faint)', fontSize: 13, cursor: 'pointer' }}>✕</button>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--ink-faint)', padding: '10px 0' }}>Completed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop: table */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 90px 80px 80px 60px', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--line-soft)', background: 'var(--paper)', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <span>PO #</span><span>Supplier</span><span style={{ textAlign: 'right' }}>Items</span><span style={{ textAlign: 'center' }}>Status</span><span>Ordered</span><span>Expected</span><span></span>
            </div>
            {filtered.map((po) => (
              <div key={po.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 90px 80px 80px 60px', gap: 8, alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>{po.poNo}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.supplier}</span>
                <span className="mono" style={{ textAlign: 'right', color: 'var(--ink-soft)' }}>{po.lines.reduce((n, l) => n + l.qty, 0)}</span>
                <span style={{ textAlign: 'center' }}>
                  <Badge tone={po.status === 'received' ? 'green' : 'amber'}>
                    {po.status === 'received' ? '✓ Received' : 'Pending'}
                  </Badge>
                </span>
                <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{po.ordered}</span>
                <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12 }}>{po.expected}</span>
                <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  {po.status === 'pending' ? (
                    <button type="button" onClick={() => onReceive(po)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--green)', background: 'var(--green-soft)', color: 'var(--green)', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--green-soft)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--green-soft)'}
                    >Receive</button>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>done</span>
                  )}
                  {po.status === 'pending' && (
                    <button type="button" onClick={() => onDeletePO(po)} style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'none', color: 'var(--ink-faint)', fontSize: 11, cursor: 'pointer' }}>✕</button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PO Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="New purchase order">
        {lowStock.length > 0 && poLines.length === 0 && (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10, background: 'var(--amber-faint)', border: '1px solid #e0d1a8', borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: isMobile ? 12 : 12, color: 'var(--amber-deep)' }}>
            <span>⚠️ {lowStock.length} product{lowStock.length !== 1 ? 's are' : ' is'} low on stock.</span>
            <button type="button" onClick={prefillLowStock} style={{ padding: isMobile ? '8px 0' : '5px 12px', borderRadius: 6, border: '1px solid #e0d1a8', background: 'var(--card)', fontSize: isMobile ? 12 : 11, fontWeight: 700, color: 'var(--amber-strong)', cursor: 'pointer', whiteSpace: 'nowrap', width: isMobile ? '100%' : undefined }}>Prefill from low stock</button>
          </div>
        )}

        <div style={{ marginBottom: isMobile ? 14 : 16 }}>
          <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Supplier</label>
          <select value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)} aria-label="Supplier" style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--card)' }}>
            {suppliers.map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: isMobile ? 12 : 14 }}>
          <label style={{ fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, display: 'block' }}>Products <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>({poLines.length})</span></label>

          <div style={{ position: 'relative', marginBottom: 8 }}>
            <input value={prodQuery} onChange={(e) => setProdQuery(e.target.value)} placeholder="Search product to add…" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, fontSize: isMobile ? 16 : 13, fontFamily: 'inherit', color: 'var(--ink)', background: 'var(--paper)' }} />
            {prodQuery && searchableProducts.length > 0 && (
              <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 9, boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 20, maxHeight: 200, overflow: 'auto' }}>
                {searchableProducts.map((p) => (
                  <div key={p.id} onClick={() => addLine(p)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') addLine(p); }}
                    style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>{p.emoji}</span>
                    <span style={{ flex: 1 }}>{p.name} <span className="mono" style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{p.sku}</span></span>
                    <span className="mono" style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{p.stock} in stock</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--line-soft)', borderRadius: 9 }}>
            {poLines.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12.5 }}>
                No products yet. Search above or use "Prefill from low stock".
              </div>
            ) : (
              poLines.map((line) => (
                <div key={line.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ flex: 1, fontSize: isMobile ? 13 : 12.5, color: 'var(--ink)', fontWeight: 600 }}>{line.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button type="button" onClick={() => changeQty(line.productId, line.qty - 1)} style={{ border: 'none', background: 'var(--paper)', width: 28, height: 28, borderRadius: 5, cursor: 'pointer', fontSize: 15, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>−</button>
                    <input type="number" min={1} value={line.qty} onChange={(e) => changeQty(line.productId, Number(e.target.value))} style={{ width: 44, textAlign: 'center', padding: '5px 2px', border: '1px solid var(--line)', borderRadius: 5, fontSize: isMobile ? 16 : 13, fontFamily: 'monospace', color: 'var(--ink)', background: 'var(--card)' }} />
                    <button type="button" onClick={() => changeQty(line.productId, line.qty + 1)} style={{ border: 'none', background: 'var(--paper)', width: 28, height: 28, borderRadius: 5, cursor: 'pointer', fontSize: 15, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>+</button>
                  </div>
                  <button type="button" onClick={() => removeLine(line.productId)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 13, padding: 4, flexShrink: 0 }}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginBottom: isMobile ? 14 : 16 }}>
          <label style={{ display: 'block', fontSize: isMobile ? 13 : 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 7 }}>Expected delivery</label>
          <input value={poExpected} onChange={(e) => setPoExpected(e.target.value)} placeholder='e.g. "Jul 10" or "Next week"' style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit', fontSize: isMobile ? 16 : 14, color: 'var(--ink)', background: 'var(--card)' }} />
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'var(--paper)', border: '1px solid var(--line-soft)', marginBottom: isMobile ? 14 : 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>Total units</span>
          <span className="mono" style={{ fontSize: isMobile ? 16 : 16, fontWeight: 800, color: 'var(--ink)' }}>{poLines.reduce((n, l) => n + l.qty, 0)}</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" onClick={() => setFormOpen(false)} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={submitPO} style={{ flex: 2 }} disabled={poLines.length === 0}>Create purchase order</Button>
        </div>
      </Modal>
    </>
  );
}
