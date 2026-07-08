import { useState } from 'react';
import { useModeration, REASON_CODES, REASON_LABEL, type ReasonCode } from './moderationStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Badge, Button, confirmDialog, toast } from '@/components/ui';

export default function ModerationPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { items, flag, unflag, remove } = useModeration();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectId, setSelectId] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<ReasonCode>('misleading');
  const [reasonText, setReasonText] = useState('');

  const filtered = items.filter((m) => {
    const term = query.trim().toLowerCase();
    const matchQ = !term || m.storeName.toLowerCase().includes(term) || m.owner.toLowerCase().includes(term) || m.email.toLowerCase().includes(term);
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchQ && matchStatus;
  });

  const flaggedCount = items.filter((m) => m.status === 'flagged').length;
  const clearCount = items.filter((m) => m.status === 'clear').length;
  const totalFlags = items.reduce((n, m) => n + m.flags, 0);

  const onRemove = async (id: string, name: string) => {
    if (!reasonCode) return toast('Select a reason code');
    if (!reasonText.trim()) return toast('Enter a reason');
    if (await confirmDialog(`Remove "${name}" permanently? This cannot be undone.`)) {
      remove(id, reasonCode, reasonText);
      setSelectId(null);
      setReasonCode('misleading');
      setReasonText('');
      toast(`${name} removed with reason: ${REASON_LABEL[reasonCode]}`);
    }
  };

  const onFlag = (id: string, name: string) => {
    if (!reasonCode) return toast('Select a reason code');
    if (!reasonText.trim()) return toast('Enter a reason');
    flag(id, reasonCode, reasonText);
    setSelectId(null);
    setReasonCode('misleading');
    setReasonText('');
    toast(`${name} flagged — ${REASON_LABEL[reasonCode]}`);
  };

  const stlInput: React.CSSProperties = {
    padding: isMobile ? '11px 14px' : '9px 14px',
    border: '1px solid var(--line)',
    borderRadius: 9,
    fontSize: isMobile ? 16 : 13,
    fontFamily: 'inherit',
    color: 'var(--ink)',
    background: 'var(--card)',
    width: isMobile ? '100%' : undefined,
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: isMobile ? 14 : 18, gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: isMobile ? 10 : 11, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--blue)', fontWeight: 600, marginBottom: isMobile ? 4 : 6 }}>Trust &amp; safety</div>
          <h2 className="display" style={{ fontSize: isMobile ? 19 : 22, margin: 0, color: 'var(--ink)', fontWeight: 800 }}>Content moderation</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: isMobile ? 12 : 13 }}>{flaggedCount} flagged · {clearCount} clear · {totalFlags} total flags</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 14 : 16 }}>
        {[
          { label: 'Total stores', value: items.length, color: 'var(--ink)' },
          { label: 'Flagged', value: flaggedCount, color: flaggedCount ? 'var(--red)' : 'var(--ink-faint)' },
          { label: 'Clear', value: clearCount, color: 'var(--green)' },
          { label: 'Total flags raised', value: totalFlags, color: 'var(--amber)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', padding: isMobile ? '10px 14px' : '12px 16px', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: isMobile ? 10 : 10.5, fontWeight: 600, color: 'var(--ink-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '.04em' }}>{s.label}</div>
            <div className="mono" style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Search + status filter */}
      <div style={{ display: 'flex', gap: isMobile ? 8 : 10, marginBottom: isMobile ? 14 : 16, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label="Search store or owner" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search store or owner…" style={{ ...stlInput, flex: '1 1 160px', minWidth: 140 }} />
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...stlInput, flex: '0 1 auto' }}>
          <option value="all">All status</option>
          <option value="flagged">Flagged</option>
          <option value="clear">Clear</option>
        </select>
      </div>

      <style>{`
        .sf-mod-card { transition: box-shadow .2s, transform .2s; }
        .sf-mod-card:hover { box-shadow: 0 8px 24px -8px rgba(0,0,0,.1); transform: translateY(-2px); }
        .sf-mod-card-actions { opacity: 0; transition: opacity .15s; }
        .sf-mod-card:hover .sf-mod-card-actions,
        .sf-mod-card:focus-within .sf-mod-card-actions { opacity: 1; }
        @media (hover: none) { .sf-mod-card-actions { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .sf-mod-card, .sf-mod-card-actions { transition: none; }
          .sf-mod-card:hover { transform: none; }
        }
      `}</style>

      {/* Cards */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: isMobile ? 12 : 20 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>All clear</p>
            <p style={{ fontSize: isMobile ? 11.5 : 12, color: 'var(--ink-faint)', margin: 0 }}>No stores match your filters.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? 10 : 14 }}>
            {filtered.map((m) => {
              const isSelected = selectId === m.id;
              const isFlagged = m.status === 'flagged';
              return (
                <div key={m.id} className="sf-mod-card" style={{ background: 'var(--card)', border: isFlagged ? '1.5px solid var(--red)' : '1px solid var(--line-soft)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: isFlagged ? '0 0 0 2px rgba(220,38,38,.08)' : 'var(--shadow)' }}>
                  {isFlagged && (
                    <div style={{ background: 'var(--red)', color: '#fff', fontSize: isMobile ? 10 : 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg>
                      Flagged · {m.flags} report{m.flags !== 1 ? 's' : ''}
                    </div>
                  )}
                  <div style={{ padding: isMobile ? 14 : 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 10 : 12, marginBottom: isMobile ? 10 : 12 }}>
                      <div style={{ width: isMobile ? 38 : 40, height: isMobile ? 38 : 40, borderRadius: 10, background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 13 : 14, fontWeight: 800, flexShrink: 0 }}>{m.initials}</div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: isMobile ? 14 : 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.storeName}</div>
                        <div className="mono" style={{ fontSize: isMobile ? 12 : 12, color: 'var(--ink-soft)' }}>{m.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginBottom: isMobile ? 8 : 10, flexWrap: 'wrap' }}>
                      <Badge tone="grey">{m.type}</Badge>
                      <Badge tone={isFlagged ? 'red' : 'green'}>{isFlagged ? 'Flagged' : 'Clear'}</Badge>
                    </div>

                    {isFlagged && m.reason && (
                      <div style={{ background: 'var(--red-soft)', borderRadius: 6, padding: isMobile ? '8px 10px' : '8px 10px', fontSize: isMobile ? 12 : 12, color: 'var(--red)', marginBottom: isMobile ? 8 : 10, lineHeight: 1.4 }}>
                        <strong>Reason:</strong> {m.reason}{m.reasonCode ? ` (${REASON_LABEL[m.reasonCode] ?? m.reasonCode})` : ''}
                        {m.reportedBy && <div style={{ fontSize: isMobile ? 11 : 11, color: 'var(--ink-faint)', marginTop: 4 }}>Reported by {m.reportedBy} · {m.reportedAt}</div>}
                      </div>
                    )}

                    {isSelected ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line-soft)', paddingTop: isMobile ? 10 : 10 }}>
                        <select aria-label="Reason code" value={reasonCode} onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
                          style={{ width: '100%', padding: isMobile ? '11px 12px' : '9px 10px', border: '1px solid var(--line)', borderRadius: 8, fontFamily: 'inherit', fontSize: isMobile ? 16 : 12.5, background: 'var(--card)', color: 'var(--ink)' }}>
                          {REASON_CODES.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                        </select>
                        <input aria-label="Reason details" value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="Describe the issue…" style={stlInput} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" onClick={() => isFlagged ? onRemove(m.id, m.storeName) : onFlag(m.id, m.storeName)} style={{ flex: 1, justifyContent: 'center' }}>
                            {isFlagged ? '✕ Remove store' : '⚑ Flag store'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectId(null); setReasonCode('misleading'); setReasonText(''); }} style={{ flex: 1, justifyContent: 'center' }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="sf-mod-card-actions" style={{ display: 'flex', gap: 6 }}>
                        {isFlagged ? (
                          <>
                            <button type="button" onClick={() => { unflag(m.id); toast(`${m.storeName} cleared`); }}
                              style={{ flex: 1, padding: isMobile ? '10px 0' : '8px 0', borderRadius: 6, border: '1px solid var(--green)', background: 'transparent', fontSize: isMobile ? 12.5 : 12, fontWeight: 600, cursor: 'pointer', color: 'var(--green)', fontFamily: 'inherit' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(22,163,74,.08)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >✓ Clear flag</button>
                            <button type="button" onClick={() => { setSelectId(m.id); setReasonCode('misleading'); setReasonText(''); }}
                              style={{ flex: 1, padding: isMobile ? '10px 0' : '8px 0', borderRadius: 6, border: '1px solid var(--red)', background: 'transparent', fontSize: isMobile ? 12.5 : 12, fontWeight: 600, cursor: 'pointer', color: 'var(--red)', fontFamily: 'inherit' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--red-soft)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >✕ Remove</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => { setSelectId(m.id); setReasonCode('misleading'); setReasonText(''); }}
                            style={{ flex: 1, padding: isMobile ? '10px 0' : '8px 0', borderRadius: 6, border: '1px solid var(--amber)', background: 'transparent', fontSize: isMobile ? 12.5 : 12, fontWeight: 600, cursor: 'pointer', color: 'var(--amber)', fontFamily: 'inherit' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217,119,6,.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >⚑ Flag store</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
