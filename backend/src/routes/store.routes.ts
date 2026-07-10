import express from "express";
import { 
    getStores, 
    getStoreById, 
    createStore, 
    updateStore, 
    changeStoreStatus 
} from "../controllers/store.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { tenantScope } from "../middleware/tenant.middleware";

const router = express.Router();

router.use(authenticate);
router.use(tenantScope);

// Platform Admin commands
router.post("/", authorize("platform_admin"), createStore);
router.post("/:id/status", authorize("platform_admin"), changeStoreStatus);

// Shared commands (platform_admin sees all stores / owner can see and edit their own)
router.get("/", authorize("platform_admin"), getStores);
router.get("/:id", authorize("platform_admin", "owner"), getStoreById);
router.put("/:id", authorize("owner"), updateStore);

export default router;