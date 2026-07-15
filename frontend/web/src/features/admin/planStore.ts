import { create } from 'zustand';
import { errorMessage } from '@/lib/http/errors';
import { planService, type Plan, type PlanInput } from './planService';

interface Result { ok: boolean; error?: string }

interface PlansState {
  plans: Plan[];
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  createPlan: (input: PlanInput) => Promise<Result>;
  updatePlan: (id: string, input: Partial<Omit<PlanInput, 'code'>>) => Promise<Result>;
  deletePlan: (id: string) => Promise<Result>;
}

export const usePlans = create<PlansState>((set) => ({
  plans: [],
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true });
    try {
      const plans = await planService.list();
      set({ plans, loading: false, loaded: true });
    } catch {
      set({ loading: false });
    }
  },

  createPlan: async (input) => {
    try {
      const plan = await planService.create(input);
      set((s) => ({ plans: [...s.plans, plan] }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not create plan') };
    }
  },

  updatePlan: async (id, input) => {
    try {
      const plan = await planService.update(id, input);
      set((s) => ({ plans: s.plans.map((p) => (p._id === id ? plan : p)) }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not update plan') };
    }
  },

  deletePlan: async (id) => {
    try {
      await planService.remove(id);
      set((s) => ({ plans: s.plans.filter((p) => p._id !== id) }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not delete plan') };
    }
  },
}));
