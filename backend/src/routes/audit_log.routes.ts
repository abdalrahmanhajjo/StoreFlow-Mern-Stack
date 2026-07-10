import express from "express";

import {
    getAuditLogs,
    getAuditLogById,
    getAuditLogsByEntity,
    deleteAuditLog,
} from "../controllers/audit_log.controller";

import { validate } from "../middleware/validate.middleware";

import {
    auditLogIdParamSchema,
    auditLogQuerySchema,
    auditEntityParamSchema,
} from "../validators/auditLog.validator";

const router = express.Router();

router.get(
    "/",
    validate(auditLogQuerySchema),
    getAuditLogs
);

router.get(
    "/entity/:entity/:entityId",
    validate(auditEntityParamSchema),
    getAuditLogsByEntity
);

router.get(
    "/:id",
    validate(auditLogIdParamSchema),
    getAuditLogById
);

router.delete(
    "/:id",
    validate(auditLogIdParamSchema),
    deleteAuditLog
);

export default router;