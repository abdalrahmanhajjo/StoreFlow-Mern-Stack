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
  add: (sale: Sale) => void;
  getByInvoice: (invoiceNo: string) => Sale | undefined;
}

let counter = 2914;
export const nextInvoiceNo = () => 'INV-' + ++counter;

// SF-503 / SF-505: completed sales (receipt source of truth).
export const useSales = create<SalesState>((set, get) => ({
  sales: [],
  add: (sale) => set((s) => ({ sales: [sale, ...s.sales] })),
  getByInvoice: (invoiceNo) => get().sales.find((s) => s.invoiceNo === invoiceNo),
}));
