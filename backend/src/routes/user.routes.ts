import express from "express";

import {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getUsers,
} from "../controllers/user.controller";

import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { tenantScope } from "../middleware/tenant.middleware";

const router = express.Router();

router.use(authenticate);
router.use(tenantScope);

router.get("/", authorize("platform_admin", "owner"), getUsers);
router.get("/:id", authorize("platform_admin", "owner"), getUserById);
router.post("/", authorize("platform_admin", "owner"), createUser);
router.put("/:id", authorize("platform_admin", "owner"), updateUser);
router.delete("/:id", authorize("platform_admin", "owner"), deleteUser);

export default router;