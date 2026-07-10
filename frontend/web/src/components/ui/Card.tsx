import type { ReactNode, CSSProperties } from 'react';

// SF-014b: Card + KpiCard
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

export function KpiCard({ label, value, delta }: { label: string; value: ReactNode; delta?: ReactNode }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-faint)', fontWeight: 600, marginBottom: 10 }}>{label}</div>
      <div className="display mono" style={{ fontSize: 27, fontWeight: 800, color: 'var(--ink)' }}>{value}</div>
      {delta && <div style={{ fontSize: 11.5, marginTop: 8, fontWeight: 600, color: 'var(--green)' }}>{delta}</div>}
    </Card>
  );
}
