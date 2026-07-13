import { create } from 'zustand';
import { isConnected, apiVoidSale } from '@/lib/api/resources';
import { refreshProducts, refreshCustomers } from '@/lib/api/hydrate';

export interface SaleLine {
  name: string;
  qty: number;
  price: number;
  emoji?: string;
}
export interface Sale {
  /** Server ObjectId — present in connected mode; needed to void the sale. */
  id?: string;
  invoiceNo: string;
  cashier: string;
  customerName: string | null;
  lines: SaleLine[];
  subtotal: number;
  discount: number;
  pointsRedeemed: number;
  tax: number;
  total: number;
  payment: string;
  pointsEarned: number;
  createdAt: number;
  status?: 'completed' | 'voided';
}

interface SalesState {
  sales: Sale[];
  hydrate: (sales: Sale[]) => void;
  add: (sale: Sale) => void;
  getByInvoice: (invoiceNo: string) => Sale | undefined;
  /** Void a completed sale: reverses stock + loyalty on the server, then marks
   *  the local copy voided and re-pulls product/customer truth. */
  voidSale: (invoiceNo: string) => Promise<{ ok: boolean; error?: string }>;
}

let counter = 2914;
export const nextInvoiceNo = () => 'INV-' + ++counter;

// SF-503 / SF-505: completed sales (receipt source of truth). Connected mode
// hydrates from the API; new sales arrive via checkout (POST /sales response).
export const useSales = create<SalesState>((set, get) => ({
  sales: [],
  hydrate: (sales) => set({ sales }),
  add: (sale) => set((s) => ({ sales: [sale, ...s.sales] })),
  getByInvoice: (invoiceNo) => get().sales.find((s) => s.invoiceNo === invoiceNo),
  voidSale: async (invoiceNo) => {
    const sale = get().sales.find((s) => s.invoiceNo === invoiceNo);
    if (!sale) return { ok: false, error: 'Sale not found' };
    if (sale.status === 'voided') return { ok: false, error: 'Sale is already voided' };

    const markVoided = () =>
      set((s) => ({
        sales: s.sales.map((x) => (x.invoiceNo === invoiceNo ? { ...x, status: 'voided' } : x)),
      }));

    if (!isConnected) {
      markVoided();
      return { ok: true };
    }

    if (!sale.id) return { ok: false, error: 'This sale cannot be voided' };
    try {
      await apiVoidSale(sale.id);
      markVoided();
      // Stock was restored and loyalty reversed server-side — re-pull truth.
      void refreshProducts();
      void refreshCustomers();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error)?.message || 'Could not void the sale' };
    }
  },
}));
