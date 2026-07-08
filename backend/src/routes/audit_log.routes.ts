import express from "express";

import {
    getAuditLogs,
    getAuditLogById,
    getAuditLogsByEntity,
    deleteAuditLog,
} from "../controllers/audit_log.controller";

const router = express.Router();

router.get("/", getAuditLogs);

router.get("/entity/:entity/:entityId", getAuditLogsByEntity);

router.get("/:id", getAuditLogById);

router.delete("/:id", deleteAuditLog);

export default router;