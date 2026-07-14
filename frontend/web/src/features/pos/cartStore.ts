import { create } from 'zustand';
import { useMemo } from 'react';
import { earn, redeemValue, pointsUsed } from '@/features/customers/loyalty';
import { roundMoney, lineAmount } from '@/lib/money';
import type { Product } from '@/features/products/productsStore';
import type { Role } from '@/store/session';

// Fallback only — the live rate comes from each store's own config (set via
// setTaxRate from the POS). Kept exported for tests and demo defaults.
export const TAX_RATE = 0.054;
export const DEFAULT_DISCOUNT = 0; // no discount until the cashier applies one
export const DEFAULT_DISCOUNT_FIXED = 0;
export type DiscountMode = 'percent' | 'fixed';

// Role-based discount caps (SF-504b).
const MAX_DISCOUNT_PCT: Record<Role, number> = {
  platform_admin: 1,
  owner: 0.5,
  manager: 0.35,
  cashier: 0.25,
};

const MAX_DISCOUNT_FIXED: Record<Role, number> = {
  platform_admin: Infinity,
  owner: 500,
  manager: 200,
  cashier: 100,
};

export function maxPctForRole(role: Role | null): number {
  return role ? MAX_DISCOUNT_PCT[role] : MAX_DISCOUNT_PCT.cashier;
}

export function maxFixedForRole(role: Role | null): number {
  return role ? MAX_DISCOUNT_FIXED[role] : MAX_DISCOUNT_FIXED.cashier;
}

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  emoji: string;
  image: string;
}

export interface CartCustomer {
  id: string;
  name: string;
  phone?: string;
  points: number;
}

export type PayMethod = 'Cash' | 'Card';

interface CartState {
  items: CartItem[];
  payMethod: PayMethod;
  customer: CartCustomer | null;
  redeeming: boolean;
  discountMode: DiscountMode;
  discountRate: number;
  discountFixed: number;
  /** This store's sales-tax rate as a fraction (0.054 = 5.4%). */
  taxRate: number;
  add: (p: Product) => void;
  changeQty: (id: string, delta: number) => void;
  remove: (id: string) => void;
  setPay: (m: PayMethod) => void;
  setCustomer: (c: CartCustomer | null) => void;
  toggleRedeem: () => void;
  setDiscountMode: (m: DiscountMode) => void;
  setDiscountRate: (rate: number, role: Role | null) => void;
  setDiscountFixed: (amount: number, role: Role | null) => void;
  setTaxRate: (rate: number) => void;
  reset: () => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],
  payMethod: 'Cash',
  customer: null,
  redeeming: false,
  discountMode: 'percent',
  discountRate: DEFAULT_DISCOUNT,
  discountFixed: DEFAULT_DISCOUNT_FIXED,
  taxRate: TAX_RATE,

  add: (p) =>
    set((s) => {
      const existing = s.items.find((i) => i.id === p.id);

      if (existing) {
        return {
          items: s.items.map((i) =>
            i.id === p.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }

      return {
        items: [
          ...s.items,
          {
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            qty: 1,
            emoji: p.emoji,
            image: p.image,
          },
        ],
      };
    }),

  changeQty: (id, delta) =>
    set((s) => ({
      items: s.items
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    })),

  remove: (id) =>
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
    })),

  setPay: (payMethod) => set({ payMethod }),

  setCustomer: (customer) =>
    set({
      customer,
      redeeming: false,
    }),

  toggleRedeem: () =>
    set((s) => ({
      redeeming: !s.redeeming,
    })),

  setDiscountMode: (mode) =>
    set({
      discountMode: mode,
    }),

  setDiscountRate: (rate, role) =>
    set({
      discountRate: Math.min(maxPctForRole(role), Math.max(0, rate)),
    }),

  setDiscountFixed: (amount, role) =>
    set({
      discountFixed: Math.min(maxFixedForRole(role), Math.max(0, amount)),
    }),

  setTaxRate: (rate) =>
    set({
      taxRate: Number.isFinite(rate) && rate >= 0 ? rate : 0,
    }),

  // Tax rate is a store setting, not per-sale — preserve it across resets.
  reset: () =>
    set((s) => ({
      items: [],
      customer: null,
      redeeming: false,
      discountMode: 'percent',
      discountRate: DEFAULT_DISCOUNT,
      discountFixed: DEFAULT_DISCOUNT_FIXED,
      payMethod: 'Cash',
      taxRate: s.taxRate,
    })),
}));

export interface CartTotals {
  subtotal: number;
  discount: number;
  discountFixed: number;
  discountPct: number;
  redeem: number;
  redeemPoints: number;
  taxable: number;
  tax: number;
  total: number;
  pointsEarned: number;
}

export function computeTotals(
  state: Pick<
    CartState,
    | 'items'
    | 'customer'
    | 'redeeming'
    | 'discountMode'
    | 'discountRate'
    | 'discountFixed'
  > & { taxRate?: number }
): CartTotals {
  const rate = state.taxRate ?? TAX_RATE;

  // Round each line to cents first, then sum — the same order the server uses,
  // so the register total always equals the server-issued receipt total.
  const subtotal = roundMoney(
    state.items.reduce((s, i) => s + lineAmount(i.price, i.qty), 0)
  );

  const discountPct = roundMoney(subtotal * state.discountRate);
  const discountFixed =
    state.discountMode === 'fixed'
      ? Math.min(state.discountFixed, subtotal)
      : 0;

  const discount =
    state.discountMode === 'percent' ? discountPct : roundMoney(discountFixed);

  const afterDiscount = roundMoney(subtotal - discount);

  const redeem =
    state.redeeming && state.customer
      ? redeemValue(state.customer.points, afterDiscount)
      : 0;

  const redeemPoints = pointsUsed(redeem);
  const taxable = roundMoney(afterDiscount - redeem);
  const tax = roundMoney(taxable * rate);
  const total = roundMoney(taxable + tax);

  return {
    subtotal,
    discount,
    discountFixed,
    discountPct,
    redeem,
    redeemPoints,
    taxable,
    tax,
    total,
    pointsEarned: earn(total),
  };
}

export const useCartTotals = (): CartTotals => {
  const items = useCart((s) => s.items);
  const customer = useCart((s) => s.customer);
  const redeeming = useCart((s) => s.redeeming);
  const discountMode = useCart((s) => s.discountMode);
  const discountRate = useCart((s) => s.discountRate);
  const discountFixed = useCart((s) => s.discountFixed);
  const taxRate = useCart((s) => s.taxRate);

  return useMemo(
    () =>
      computeTotals({
        items,
        customer,
        redeeming,
        discountMode,
        discountRate,
        discountFixed,
        taxRate,
      }),
    [
      items,
      customer,
      redeeming,
      discountMode,
      discountRate,
      discountFixed,
      taxRate,
    ]
  );
};