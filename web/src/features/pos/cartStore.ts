import { create } from 'zustand';
import { useMemo } from 'react';
import { earn, redeemValue, pointsUsed } from '@/features/customers/loyalty';
import type { Product } from '@/features/products/productsStore';

export const TAX_RATE = 0.054;
export const DEFAULT_DISCOUNT = 0.1; // 10% promo
export const MAX_DISCOUNT = 0.25; // SF-504b: cashier discount cap

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  emoji: string;
  image: string;
}
export interface CartCustomer {
  id: string;
  name: string;
  points: number;
}
export type PayMethod = 'Cash' | 'Card' | 'Mobile';

interface CartState {
  items: CartItem[];
  payMethod: PayMethod;
  customer: CartCustomer | null;
  redeeming: boolean;
  discountRate: number;
  add: (p: Product) => void;
  changeQty: (id: string, delta: number) => void;
  remove: (id: string) => void;
  setPay: (m: PayMethod) => void;
  setCustomer: (c: CartCustomer | null) => void;
  toggleRedeem: () => void;
  setDiscountRate: (rate: number) => void; // clamped to [0, MAX_DISCOUNT]
  reset: () => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],
  payMethod: 'Cash',
  customer: null,
  redeeming: false,
  discountRate: DEFAULT_DISCOUNT,

  // SF-501
  add: (p) =>
    set((s) => {
      const existing = s.items.find((i) => i.id === p.id);
      if (existing) return { items: s.items.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i)) };
      return { items: [...s.items, { id: p.id, name: p.name, price: p.price, qty: 1, emoji: p.emoji, image: p.image }] };
    }),
  // SF-502
  changeQty: (id, delta) =>
    set((s) => ({
      items: s.items
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  setPay: (payMethod) => set({ payMethod }),
  // SF-504
  setCustomer: (customer) => set({ customer, redeeming: false }),
  toggleRedeem: () => set((s) => ({ redeeming: !s.redeeming })),
  // SF-504b: clamp discount to the allowed cap, never negative
  setDiscountRate: (rate) => set({ discountRate: Math.min(MAX_DISCOUNT, Math.max(0, rate)) }),
  reset: () => set({ items: [], customer: null, redeeming: false, discountRate: DEFAULT_DISCOUNT, payMethod: 'Cash' }),
}));

export interface CartTotals {
  subtotal: number;
  discount: number;
  redeem: number;
  redeemPoints: number;
  taxable: number;
  tax: number;
  total: number;
  pointsEarned: number;
}

// Pure totals computation (unit-tested).
export function computeTotals(state: Pick<CartState, 'items' | 'customer' | 'redeeming' | 'discountRate'>): CartTotals {
  const subtotal = state.items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = subtotal * state.discountRate;
  const afterDiscount = subtotal - discount;
  const redeem = state.redeeming && state.customer ? redeemValue(state.customer.points, afterDiscount) : 0;
  const redeemPoints = pointsUsed(redeem);
  const taxable = afterDiscount - redeem;
  const tax = taxable * TAX_RATE;
  const total = taxable + tax;
  return { subtotal, discount, redeem, redeemPoints, taxable, tax, total, pointsEarned: earn(total) };
}

// Select raw fields and memo-derive so the returned object stays referentially stable.
export const useCartTotals = (): CartTotals => {
  const items = useCart((s) => s.items);
  const customer = useCart((s) => s.customer);
  const redeeming = useCart((s) => s.redeeming);
  const discountRate = useCart((s) => s.discountRate);
  return useMemo(() => computeTotals({ items, customer, redeeming, discountRate }), [items, customer, redeeming, discountRate]);
};
