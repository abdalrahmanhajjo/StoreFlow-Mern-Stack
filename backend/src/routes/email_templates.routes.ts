import { Router } from "express";
import { EmailTemplateController } from "../controllers/email_templates.controllers";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createEmailTemplateSchema,
  updateEmailTemplateSchema,
  sendTemplateEmailSchema,
} from "../validators/email_template.validator";

const router = Router();
const controller = new EmailTemplateController();

router.use(authenticate);
router.use(authorize("platform_admin"));

// Template Management CRUD
router.get("/", controller.getTemplates);
router.get("/:id", controller.getTemplate);
router.post("/", validate(createEmailTemplateSchema), controller.createTemplate);
router.post("/:id", validate(updateEmailTemplateSchema), controller.updateTemplate); // was PUT
router.delete("/:id", controller.deleteTemplate);

// Test-send a template to a real address — was missing authorize() entirely,
// meaning any authenticated user (not just platform_admin) could have used
// your Gmail sender to fire arbitrary emails at any address.
router.post("/:slug/send", validate(sendTemplateEmailSchema), controller.testSend);

export default router;