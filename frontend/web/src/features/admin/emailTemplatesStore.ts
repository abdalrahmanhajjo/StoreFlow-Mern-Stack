import { create } from 'zustand';
import { errorMessage } from '@/lib/http/errors';
import { emailTemplateService, type EmailTemplate, type EmailTemplateInput } from './emailTemplateService';

interface Result { ok: boolean; error?: string }

interface EmailTemplatesState {
  templates: EmailTemplate[];
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  createTemplate: (input: EmailTemplateInput) => Promise<Result>;
  updateTemplate: (id: string, input: Partial<EmailTemplateInput>) => Promise<Result>;
  deleteTemplate: (id: string) => Promise<Result>;
  testSend: (slug: string, to: string, variables: Record<string, string>) => Promise<Result>;
}

export const useEmailTemplates = create<EmailTemplatesState>((set) => ({
  templates: [],
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true });
    try {
      const templates = await emailTemplateService.list();
      set({ templates, loading: false, loaded: true });
    } catch {
      set({ loading: false });
    }
  },

  createTemplate: async (input) => {
    try {
      const template = await emailTemplateService.create(input);
      set((s) => ({ templates: [template, ...s.templates] }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not create template') };
    }
  },

  updateTemplate: async (id, input) => {
    try {
      const template = await emailTemplateService.update(id, input);
      set((s) => ({ templates: s.templates.map((t) => (t._id === id ? template : t)) }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not update template') };
    }
  },

  deleteTemplate: async (id) => {
    try {
      await emailTemplateService.remove(id);
      set((s) => ({ templates: s.templates.filter((t) => t._id !== id) }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not delete template') };
    }
  },

  testSend: async (slug, to, variables) => {
    try {
      await emailTemplateService.testSend(slug, to, variables);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, 'Could not send test email') };
    }
  },
}));