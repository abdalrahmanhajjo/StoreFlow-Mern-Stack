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

const router = express.Router();

router.get("/", authenticate, authorize("owner"), getSuppliers);

router.get("/:id", authenticate, authorize("owner"), getSupplierById);

router.post("/", authenticate, authorize("owner"), createSupplier);

router.put("/:id", authenticate, authorize("owner"), updateSupplier);

router.patch("/:id/products", authenticate, authorize("owner"), addProductToSupplier);

router.delete("/:id/products/:productId", authenticate, authorize("owner"), removeProductFromSupplier);

router.delete("/:id", authenticate, authorize("owner"), deleteSupplier);

export default router;