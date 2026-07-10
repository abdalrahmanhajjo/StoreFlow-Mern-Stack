import { create } from 'zustand';
import moderationData from '@/data/moderation.json';

export type ReasonCode = 'misleading' | 'counterfeit' | 'spam' | 'trademark' | 'prohibited' | 'other';

export interface ModerationItem {
  id: string;
  storeName: string;
  owner: string;
  email: string;
  initials: string;
  color: string;
  type: string;
  reason: string;
  reasonCode: string;
  reportedBy: string;
  reportedAt: string;
  status: 'flagged' | 'clear';
  flags: number;
}

export const REASON_CODES: { code: ReasonCode; label: string }[] = [
  { code: 'misleading', label: 'Misleading content' },
  { code: 'counterfeit', label: 'Counterfeit products' },
  { code: 'spam', label: 'Spam / scam' },
  { code: 'trademark', label: 'Trademark violation' },
  { code: 'prohibited', label: 'Prohibited items' },
  { code: 'other', label: 'Other' },
];

export const REASON_LABEL: Record<string, string> = {
  misleading: 'Misleading content',
  counterfeit: 'Counterfeit products',
  spam: 'Spam / scam',
  trademark: 'Trademark violation',
  prohibited: 'Prohibited items',
  other: 'Other',
};

const DATA = moderationData as ModerationItem[];

interface ModerationState {
  items: ModerationItem[];
  flag: (id: string, reasonCode: ReasonCode, reason: string) => void;
  unflag: (id: string) => void;
  remove: (id: string, reasonCode: ReasonCode, reason: string) => void;
}

export const useModeration = create<ModerationState>((set) => ({
  items: DATA,
  flag: (id, reasonCode, reason) => set((s) => ({
    items: s.items.map((m) =>
      m.id === id ? { ...m, status: 'flagged' as const, reasonCode, reason, reportedAt: 'just now', reportedBy: 'Platform Admin', flags: m.flags + 1 } : m
    ),
  })),
  unflag: (id) => set((s) => ({
    items: s.items.map((m) =>
      m.id === id ? { ...m, status: 'clear' as const, reasonCode: '', reason: '', reportedBy: '', reportedAt: '' } : m
    ),
  })),
  remove: (id, _reasonCode, _reason) => set((s) => ({
    items: s.items.filter((m) => m.id !== id),
  })),
}));
