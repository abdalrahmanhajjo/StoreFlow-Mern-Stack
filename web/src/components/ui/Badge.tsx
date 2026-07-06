import type { ReactNode } from 'react';

type Tone = 'green' | 'red' | 'amber' | 'grey' | 'blue';

const tones: Record<Tone, React.CSSProperties> = {
  green: { background: 'var(--green-soft)', color: '#15803d' },
  red: { background: 'var(--red-soft)', color: '#b91c1c' },
  amber: { background: '#fef3c7', color: '#b45309' },
  grey: { background: 'var(--paper-dim)', color: 'var(--ink-soft)' },
  blue: { background: 'var(--blue-soft)', color: 'var(--blue-deep)' },
};

// SF-014b: Badge
export function Badge({ tone = 'grey', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, ...tones[tone] }}>
      {children}
    </span>
  );
}

export type Tier = 'Bronze' | 'Silver' | 'Gold';

const tierStyle: Record<Tier, React.CSSProperties> = {
  Gold: { background: 'var(--tier-gold-bg)', color: 'var(--tier-gold-fg)' },
  Silver: { background: 'var(--tier-silver-bg)', color: 'var(--tier-silver-fg)' },
  Bronze: { background: 'var(--tier-bronze-bg)', color: 'var(--tier-bronze-fg)' },
};

// SF-014b: TierBadge (loyalty)
export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, ...tierStyle[tier] }}>
      {tier}
    </span>
  );
}

export const tierFor = (points: number): Tier => (points >= 500 ? 'Gold' : points >= 100 ? 'Silver' : 'Bronze');
