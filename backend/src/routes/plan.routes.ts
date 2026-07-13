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

// Platform-level resource — platform_admin only. No tenantScope here:
// plans aren't owned by a store, they're the thing stores get assigned TO.
router.use(authenticate);
router.use(authorize("platform_admin"));

router.get("/", getPlans);
router.get("/:id", getPlanById);
router.post("/", validate(createPlanSchema), createPlan);
router.post("/:id", validate(updatePlanSchema), updatePlan);
router.delete("/:id", deletePlan);

router.post("/stores/:storeId/assign", validate(assignPlanSchema), assignPlanToStore);

export default router;