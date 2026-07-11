import { create } from 'zustand';
import { useProducts } from '@/features/products/productsStore';
import adjustmentsData from '@/data/inventoryAdjustments.json';
import { toast } from '@/components/ui';
import { isConnected, apiCreateAdjustment } from '@/lib/api/resources';

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
const SEED: Adjustment[] = isConnected
  ? []
  : (adjustmentsData as SeedAdjustment[]).map(({ daysAgo, ...a }) => ({
      ...a,
      at: Date.now() - daysAgo * 864e5,
    }));

let seq = 100;

interface InventoryState {
  adjustments: Adjustment[];
  hydrate: (adjustments: Adjustment[]) => void;
  adjust: (productId: string, delta: number, reason: AdjustReason, note: string, by: string) => { ok: boolean; error?: string };
  clear: () => void;
}

// SF-701: manual stock adjustments. The stock write is local-only — in
// connected mode the server applies the same change when the adjustment posts.
export const useInventory = create<InventoryState>((set) => ({
  adjustments: SEED,
  hydrate: (adjustments) => set({ adjustments }),
  adjust: (productId, delta, reason, note, by) => {
    if (delta === 0) return { ok: false, error: 'Enter a non-zero change' };
    const product = useProducts.getState().products.find((p) => p.id === productId);
    if (!product) return { ok: false, error: 'Product not found' };
    if (product.stock + delta < 0) return { ok: false, error: 'Adjustment would make stock negative' };

    useProducts.getState().setStockLocal(productId, product.stock + delta);
    const localId = 'a' + ++seq;
    set((s) => ({
      adjustments: [
        { id: localId, productId, productName: product.name, delta, reason, note, by, at: Date.now() },
        ...s.adjustments,
      ],
    }));
    if (isConnected) {
      apiCreateAdjustment({ productId, delta, reason, note, by }).catch((err) => {
        useProducts.getState().setStockLocal(productId, product.stock);
        set((s) => ({ adjustments: s.adjustments.filter((a) => a.id !== localId) }));
        toast.error(err?.message || 'Could not save the stock adjustment to the server');
      });
    }
    return { ok: true };
  },
  clear: () => set({ adjustments: [] }),
}));
