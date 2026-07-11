import { create } from 'zustand';
import { isConnected, apiGetStore, type RawStore } from './resources';

/**
 * The signed-in workspace's real store document (name, currency, status).
 * Loaded once per storeId; refresh() re-pulls after settings saves so the
 * shell, receipts and POS pick up identity changes immediately.
 */
interface StoreIdentityState {
  store: RawStore | null;
  loadedFor: string | null;
  load: (storeId: string) => void;
  refresh: () => Promise<void>;
  clear: () => void;
}

export const useStoreIdentity = create<StoreIdentityState>((set, get) => ({
  store: null,
  loadedFor: null,
  load: (storeId) => {
    if (!isConnected || get().loadedFor === storeId) return;
    set({ loadedFor: storeId });
    apiGetStore(storeId)
      .then((store) => set({ store }))
      .catch(() => set({ loadedFor: null }));
  },
  refresh: async () => {
    const id = get().loadedFor;
    if (id) set({ store: await apiGetStore(id) });
  },
  clear: () => set({ store: null, loadedFor: null }),
}));
