import express from "express";

import {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addProductToSupplier,
    removeProductFromSupplier,
} from "../controllers/supplierController";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { tenantScope } from "../middleware/tenant.middleware";

const router = express.Router();

// Apply Authentication, Tenant Scoping, and Role Authorization globally to all supplier routes
router.use(authenticate);
router.use(tenantScope);
router.use(authorize("owner"));

router.get("/", getSuppliers);

router.get("/:id", getSupplierById);

router.post("/", createSupplier);

router.put("/:id", updateSupplier);

router.patch("/:id/products", addProductToSupplier);

router.delete("/:id/products/:productId", removeProductFromSupplier);

router.delete("/:id", deleteSupplier);

export default router;