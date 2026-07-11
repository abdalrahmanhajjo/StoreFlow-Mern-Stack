import { create } from 'zustand';
import { useProducts } from '@/features/products/productsStore';
import suppliersData from '@/data/suppliers.json';
import purchaseOrdersData from '@/data/purchaseOrders.json';

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
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

export type SupplierInput = Pick<Supplier, 'name' | 'phone' | 'email' | 'address'>;

const SUPPLIERS = (suppliersData as any[]).map((s) => ({ ...s, address: '' })) as Supplier[];
const POS = purchaseOrdersData as PurchaseOrder[];

let supSeq = 100;
let poSeq = 418;

interface SupplyState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addSupplier: (input: SupplierInput) => { ok: boolean; error?: string };
  updateSupplier: (id: string, input: Partial<SupplierInput>) => { ok: boolean; error?: string };
  removeSupplier: (id: string) => void;
  createPO: (supplier: string, lines: POLine[], expected: string) => { ok: boolean; error?: string };
  removePO: (id: string) => void;
  receivePO: (id: string) => number;
}

function productsForSupplier(supplierId: string) {
  return useProducts.getState().products.filter((p) => p.supplierId === supplierId);
}

export function supplierProductCount(supplierId: string): number {
  return productsForSupplier(supplierId).length;
}

export function supplierLinkedProducts(supplierId: string) {
  return productsForSupplier(supplierId);
}

export const useSupply = create<SupplyState>((set, get) => ({
  suppliers: SUPPLIERS,
  purchaseOrders: POS,
  addSupplier: (input) => {
    if (!input.name.trim()) return { ok: false, error: 'Name is required' };
    set((s) => ({ suppliers: [...s.suppliers, { id: 'sup' + ++supSeq, ...input, name: input.name.trim() }] }));
    return { ok: true };
  },
  updateSupplier: (id, input) => {
    const existing = get().suppliers.find((s) => s.id === id);
    if (!existing) return { ok: false, error: 'Supplier not found' };
    set((s) => ({
      suppliers: s.suppliers.map((sup) =>
        sup.id === id ? { ...sup, ...input, name: input.name?.trim() ?? sup.name } : sup
      ),
    }));
    return { ok: true };
  },
  removeSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) })),
  createPO: (supplier, lines, expected) => {
    if (!supplier.trim()) return { ok: false, error: 'Supplier is required' };
    if (lines.length === 0) return { ok: false, error: 'Add at least one product' };
    const today = new Date();
    const fmt = (d: Date) => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
    set((s) => ({
      purchaseOrders: [{
        id: 'po' + ++poSeq,
        poNo: 'PO-0' + poSeq,
        supplier: supplier.trim(),
        lines: lines.map((l) => ({ ...l })),
        status: 'pending',
        ordered: fmt(today),
        expected,
      }, ...s.purchaseOrders],
    }));
    return { ok: true };
  },
  removePO: (id) => set((s) => ({ purchaseOrders: s.purchaseOrders.filter((p) => p.id !== id) })),
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
