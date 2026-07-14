import { Request, Response, NextFunction } from "express";
import { EmailTemplate } from "../models/email_templates.model";
import { sendDynamicTemplateEmail } from "../utils/mail.utils";

export class EmailTemplateController {
  // GET /api/email-templates
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await EmailTemplate.find().sort({ createdAt: -1 });
      res.status(200).json(templates);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/email-templates/:id
  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await EmailTemplate.findById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(200).json(template);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/email-templates
  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const newTemplate = await EmailTemplate.create(req.body);
      res.status(201).json(newTemplate);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/email-templates/:id  (was PUT)
  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await EmailTemplate.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Template not found" });
      }

      // System templates are looked up by slug from code (auth.utils.ts etc).
      // Renaming the slug would silently break password reset / OTP / invite
      // emails, so that one field is locked once a template is a system one.
      if (existing.isSystem && req.body.slug && req.body.slug !== existing.slug) {
        return res.status(400).json({
          message: "Cannot change the slug of a system template — code depends on it staying the same.",
        });
      }

      const updated = await EmailTemplate.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/email-templates/:id
  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const template = await EmailTemplate.findById(req.params.id);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Safety guard check to keep native system configurations locked down
      if (template.isSystem) {
        return res.status(400).json({ message: "System templates cannot be deleted" });
      }

      await template.deleteOne();
      res.status(200).json({ message: "Template deleted successfully" });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/email-templates/:slug/send
  async testSend(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params as { slug: string };
      const { to, variables } = req.body;

      const success = await sendDynamicTemplateEmail(to, slug, variables);
      
      if (success) {
        res.status(200).json({ message: `Email successfully dispatched to ${to}` });
      } else {
        res.status(500).json({ message: "Email delivery failed. Verify logs for execution errors." });
      }
    } catch (err) {
      next(err);
    }
  }
}