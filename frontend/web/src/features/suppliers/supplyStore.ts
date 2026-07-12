import { create } from 'zustand';
import { useProducts } from '@/features/products/productsStore';
import suppliersData from '@/data/suppliers.json';
import purchaseOrdersData from '@/data/purchaseOrders.json';
import { toast } from '@/components/ui';
import {
  isConnected,
  apiCreateSupplier,
  apiUpdateSupplier,
  apiDeleteSupplier,
  apiCreatePurchaseOrder,
  apiReceivePurchaseOrder,
  apiDeletePurchaseOrder,
} from '@/lib/api/resources';

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

const SUPPLIERS = isConnected
  ? []
  : ((suppliersData as object[]).map((s) => ({ ...s, address: '' })) as Supplier[]);
const POS = isConnected ? [] : (purchaseOrdersData as PurchaseOrder[]);

let supSeq = 100;
let poSeq = 418;

interface SupplyState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  hydrateSuppliers: (suppliers: Supplier[]) => void;
  hydratePurchaseOrders: (purchaseOrders: PurchaseOrder[]) => void;
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

/** After a rejected supplier update/delete, pull server truth; fall back to
 *  the pre-change snapshot if the refetch also fails. */
async function reconcileSuppliers(fallback: Supplier[]) {
  try {
    const { refreshSuppliers } = await import('@/lib/api/hydrate');
    await refreshSuppliers();
  } catch {
    useSupply.setState({ suppliers: fallback });
  }
}

export const useSupply = create<SupplyState>((set, get) => ({
  suppliers: SUPPLIERS,
  purchaseOrders: POS,
  hydrateSuppliers: (suppliers) => set({ suppliers }),
  hydratePurchaseOrders: (purchaseOrders) => set({ purchaseOrders }),
  addSupplier: (input) => {
    if (!input.name.trim()) return { ok: false, error: 'Name is required' };
    const localId = 'sup' + ++supSeq;
    set((s) => ({ suppliers: [...s.suppliers, { id: localId, ...input, name: input.name.trim() }] }));
    if (isConnected) {
      apiCreateSupplier({ ...input, name: input.name.trim() })
        .then((server) =>
          set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === localId ? server : x)) }))
        )
        .catch((err) => {
          set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== localId) }));
          toast.error(err?.message || 'Could not save the supplier to the server');
        });
    }
    return { ok: true };
  },
  updateSupplier: (id, input) => {
    const existing = get().suppliers.find((s) => s.id === id);
    if (!existing) return { ok: false, error: 'Supplier not found' };
    const prev = get().suppliers;
    set((s) => ({
      suppliers: s.suppliers.map((sup) =>
        sup.id === id ? { ...sup, ...input, name: input.name?.trim() ?? sup.name } : sup
      ),
    }));
    if (isConnected) {
      apiUpdateSupplier(id, { ...input, name: input.name?.trim() }).catch((err) => {
        toast.error(err?.message || 'Could not save supplier changes to the server');
        reconcileSuppliers(prev);
      });
    }
    return { ok: true };
  },
  removeSupplier: (id) => {
    const prev = get().suppliers;
    set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) }));
    if (isConnected) {
      apiDeleteSupplier(id).catch((err) => {
        toast.error(err?.message || 'Could not delete the supplier on the server');
        reconcileSuppliers(prev);
      });
    }
  },
  createPO: (supplier, lines, expected) => {
    if (!supplier.trim()) return { ok: false, error: 'Supplier is required' };
    if (lines.length === 0) return { ok: false, error: 'Add at least one product' };
    const today = new Date();
    const fmt = (d: Date) => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`;
    const localId = 'po' + ++poSeq;
    set((s) => ({
      purchaseOrders: [{
        id: localId,
        poNo: 'PO-0' + poSeq,
        supplier: supplier.trim(),
        lines: lines.map((l) => ({ ...l })),
        status: 'pending',
        ordered: fmt(today),
        expected,
      }, ...s.purchaseOrders],
    }));
    if (isConnected) {
      const supplierId = get().suppliers.find((x) => x.name === supplier.trim())?.id;
      const products = useProducts.getState().products;
      if (!supplierId) {
        set((s) => ({ purchaseOrders: s.purchaseOrders.filter((p) => p.id !== localId) }));
        return { ok: false, error: 'Supplier not found on the server' };
      }
      apiCreatePurchaseOrder(
        supplierId,
        lines.map((l) => ({
          productId: l.productId,
          quantityOrdered: l.qty,
          unitCost: products.find((p) => p.id === l.productId)?.cost ?? 0,
        }))
      )
        .then((server) =>
          set((s) => ({
            purchaseOrders: s.purchaseOrders.map((p) => (p.id === localId ? { ...server, expected } : p)),
          }))
        )
        .catch((err) => {
          set((s) => ({ purchaseOrders: s.purchaseOrders.filter((p) => p.id !== localId) }));
          toast.error(err?.message || 'Could not save the purchase order to the server');
        });
    }
    return { ok: true };
  },
  removePO: (id) => {
    set((s) => ({ purchaseOrders: s.purchaseOrders.filter((p) => p.id !== id) }));
    if (isConnected) {
      apiDeletePurchaseOrder(id).catch((err) =>
        toast.error(err?.message || 'Could not delete the purchase order on the server')
      );
    }
  },
  receivePO: (id) => {
    const po = get().purchaseOrders.find((p) => p.id === id);
    if (!po || po.status === 'received') return 0;
    let added = 0;
    const products = useProducts.getState().products;
    po.lines.forEach((line) => {
      const prod = products.find((p) => p.id === line.productId);
      if (prod) {
        // Local-only: the server applies the stock increase itself on receive.
        useProducts.getState().setStockLocal(prod.id, prod.stock + line.qty);
        added += line.qty;
      }
    });
    set((s) => ({ purchaseOrders: s.purchaseOrders.map((p) => (p.id === id ? { ...p, status: 'received' } : p)) }));
    if (isConnected) {
      apiReceivePurchaseOrder(
        id,
        po.lines.map((l) => ({ productId: l.productId, quantityReceived: l.qty }))
      ).catch((err) =>
        toast.error(err?.message || 'Could not mark the purchase order received on the server')
      );
    }
    return added;
  },
}));

export const nextPoNo = () => 'PO-0' + ++poSeq;
