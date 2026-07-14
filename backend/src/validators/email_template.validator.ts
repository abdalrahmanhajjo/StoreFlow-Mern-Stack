import { z } from "zod";

export const createEmailTemplateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .lowercase()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
    subject: z.string().trim().max(200),
    html: z.string().min(1, "HTML content is required"),
    text: z.string().optional(),
    description: z.string().max(500).optional(),
    variables: z.array(z.string()).default([]),
    isActive: z.boolean().optional(),
    isSystem: z.boolean().optional(),
  }),
});

export const updateEmailTemplateSchema = z.object({
  body: createEmailTemplateSchema.shape.body.partial(),
});

export const sendTemplateEmailSchema = z.object({
  body: z.object({
    to: z.string().email(),
    variables: z.record(z.string(), z.any()), // e.g., { "code": "1234", "name": "Alex" }
  }),
});