import { create } from 'zustand';
import { useProducts } from '@/features/products/productsStore';
import adjustmentsData from '@/data/inventoryAdjustments.json';

export type AdjustReason = 'Restock' | 'Damage' | 'Recount' | 'Expired';

export interface Adjustment {
  id: string;
  productId: string;
  productName: string;
  delta: number;
  reason: AdjustReason;
  note: string;
  by: string;
  at: number;
}

type SeedAdjustment = Omit<Adjustment, 'at'> & { daysAgo: number };
const SEED: Adjustment[] = (adjustmentsData as SeedAdjustment[]).map(({ daysAgo, ...a }) => ({
  ...a,
  at: Date.now() - daysAgo * 864e5,
}));

let seq = 100;

interface InventoryState {
  adjustments: Adjustment[];
  adjust: (productId: string, delta: number, reason: AdjustReason, note: string, by: string) => { ok: boolean; error?: string };
}

// SF-701: manual stock adjustments (client-only; swap for API later).
export const useInventory = create<InventoryState>((set) => ({
  adjustments: SEED,
  adjust: (productId, delta, reason, note, by) => {
    if (delta === 0) return { ok: false, error: 'Enter a non-zero change' };
    const product = useProducts.getState().products.find((p) => p.id === productId);
    if (!product) return { ok: false, error: 'Product not found' };
    if (product.stock + delta < 0) return { ok: false, error: 'Adjustment would make stock negative' };

    useProducts.getState().update(productId, { stock: product.stock + delta });
    set((s) => ({
      adjustments: [
        { id: 'a' + ++seq, productId, productName: product.name, delta, reason, note, by, at: Date.now() },
        ...s.adjustments,
      ],
    }));
    return { ok: true };
  },
}));
