import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import {
    createPlan,
    getPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    assignPlanToStore,
} from "../controllers/plan.controllers";
import {
    createPlanSchema,
    updatePlanSchema,
    assignPlanSchema,
} from "../validators/plan.validator";

const router = express.Router();

// Plans list + detail: available to any authenticated user (for the billing page)
router.get("/", authenticate, getPlans);
router.get("/:id", authenticate, getPlanById);

// Mutations: platform_admin only
router.post("/", authenticate, authorize("platform_admin"), validate(createPlanSchema), createPlan);
router.post("/:id", authenticate, authorize("platform_admin"), validate(updatePlanSchema), updatePlan);
router.delete("/:id", authenticate, authorize("platform_admin"), deletePlan);
router.post("/stores/:storeId/assign", authenticate, authorize("platform_admin"), validate(assignPlanSchema), assignPlanToStore);

export default router;