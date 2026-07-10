import { create } from 'zustand';

export interface SaleLine {
  name: string;
  qty: number;
  price: number;
  emoji?: string;
}
export interface Sale {
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
}

interface SalesState {
  sales: Sale[];
  hydrate: (sales: Sale[]) => void;
  add: (sale: Sale) => void;
  getByInvoice: (invoiceNo: string) => Sale | undefined;
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
}));
