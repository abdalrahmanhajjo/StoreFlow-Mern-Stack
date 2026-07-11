import express from "express";
import { getEmployees, inviteEmployee, updateEmployeeRole, toggleEmployeeStatus, deleteEmployee } from "../controllers/employee.controllers";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { tenantScope } from "../middleware/tenant.middleware";


const router = express.Router();

router.use(authenticate);
router.use(tenantScope);

router.get(
    "/",
    authorize("owner","manager"),
    getEmployees
);

router.post(
    "/invite",
    authorize("owner","manager"),
    inviteEmployee
);

router.post(
    "/:id/role",
    authorize("owner"),
    updateEmployeeRole
);

router.post(
    "/:id/status",
    authorize("owner","manager"),
    toggleEmployeeStatus
);

router.delete(
    "/:id",
    authorize("owner"),
    deleteEmployee
);

export default router;