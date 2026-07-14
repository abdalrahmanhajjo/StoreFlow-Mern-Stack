import { api } from '@/lib/axios';

export interface EmailTemplate {
  _id: string;
  name: string;
  slug: string;
  subject: string;
  html: string;
  text?: string;
  description?: string;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
}

export type EmailTemplateInput = Omit<EmailTemplate, '_id' | 'slug' | 'isSystem'>;

const slugify = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const emailTemplateService = {
  async list(): Promise<EmailTemplate[]> {
    const res = await api.get('/email-templates');
    return res.data;
  },
  async create(input: EmailTemplateInput): Promise<EmailTemplate> {
    const res = await api.post('/email-templates', { ...input, slug: slugify(input.name) });
    return res.data;
  },
  async update(id: string, input: Partial<EmailTemplateInput>): Promise<EmailTemplate> {
    const res = await api.post(`/email-templates/${id}`, input); // backend uses POST, not PATCH/PUT
    return res.data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/email-templates/${id}`);
  },
  async testSend(slug: string, to: string, variables: Record<string, string>): Promise<void> {
    await api.post(`/email-templates/${slug}/send`, { to, variables });
  },
};