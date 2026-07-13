import { create } from 'zustand';
import { planService, storeService, type Plan, type PlanInput, type AssignableStore } from './planService';

interface Result { ok: boolean; error?: string }

interface PlansState {
  plans: Plan[];
  stores: AssignableStore[];
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  createPlan: (input: PlanInput) => Promise<Result>;
  updatePlan: (id: string, input: Partial<PlanInput>) => Promise<Result>;
  deletePlan: (id: string) => Promise<Result>;
  assignPlan: (storeId: string, planId: string) => Promise<Result>;
}

export const usePlans = create<PlansState>((set, get) => ({
  plans: [],
  stores: [],
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true });
    try {
      const [plans, stores] = await Promise.all([
        planService.list(),
        storeService.listForPlanAssignment(),
      ]);
      set({ plans, stores, loading: false, loaded: true });
    } catch {
      set({ loading: false });
    }
  },

  createPlan: async (input) => {
    try {
      const plan = await planService.create(input);
      set((s) => ({ plans: [...s.plans, plan] }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Could not create plan' };
    }
  },

  updatePlan: async (id, input) => {
    try {
      const plan = await planService.update(id, input);
      set((s) => ({ plans: s.plans.map((p) => (p._id === id ? plan : p)) }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Could not update plan' };
    }
  },

  deletePlan: async (id) => {
    try {
      await planService.remove(id);
      set((s) => ({ plans: s.plans.filter((p) => p._id !== id) }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Could not delete plan' };
    }
  },

  assignPlan: async (storeId, planId) => {
    try {
      await planService.assignToStore(storeId, planId);
      set((s) => ({
        stores: s.stores.map((st) => (st.id === storeId ? { ...st, planId } : st)),
        plans: s.plans.map((p) => {
          // Keep storeCount roughly in sync without a full reload:
          // -1 from whatever plan the store was on, +1 to the new one.
          const wasOnThis = get().stores.find((st) => st.id === storeId)?.planId === p._id;
          if (p._id === planId) return { ...p, storeCount: p.storeCount + 1 };
          if (wasOnThis) return { ...p, storeCount: Math.max(0, p.storeCount - 1) };
          return p;
        }),
      }));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Could not assign plan' };
    }
  },
}));