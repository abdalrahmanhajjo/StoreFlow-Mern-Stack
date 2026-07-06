import { create } from 'zustand';
import { useProducts } from '@/features/products/productsStore';
import suppliersData from '@/data/suppliers.json';
import purchaseOrdersData from '@/data/purchaseOrders.json';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  productCount: number;
}
export interface POLine {
  productId: string;
  name: string;
  qty: number;
}
export interface PurchaseOrder {
  id: string;
  poNo: string;
  supplier: string;
  lines: POLine[];
  status: 'pending' | 'received';
  ordered: string;
  expected: string;
}

const SUPPLIERS = suppliersData as Supplier[];
const POS = purchaseOrdersData as PurchaseOrder[];

let supSeq = 100;
let poSeq = 418;

interface SupplyState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addSupplier: (name: string, phone: string, email: string) => { ok: boolean; error?: string };
  removeSupplier: (id: string) => void;
  receivePO: (id: string) => number; // returns units added to stock
}

export const useSupply = create<SupplyState>((set, get) => ({
  suppliers: SUPPLIERS,
  purchaseOrders: POS,
  addSupplier: (name, phone, email) => {
    if (!name.trim()) return { ok: false, error: 'Name is required' };
    set((s) => ({ suppliers: [...s.suppliers, { id: 'sup' + ++supSeq, name: name.trim(), phone, email, productCount: 0 }] }));
    return { ok: true };
  },
  removeSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) })),
  // SF-802: receiving a PO increments product stock and locks the PO.
  receivePO: (id) => {
    const po = get().purchaseOrders.find((p) => p.id === id);
    if (!po || po.status === 'received') return 0;
    let added = 0;
    const products = useProducts.getState().products;
    po.lines.forEach((line) => {
      const prod = products.find((p) => p.id === line.productId);
      if (prod) {
        useProducts.getState().update(prod.id, { stock: prod.stock + line.qty });
        added += line.qty;
      }
    });
    set((s) => ({ purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'received' } : p)) }));
    return added;
  },
}));

export const nextPoNo = () => 'PO-0' + ++poSeq;
