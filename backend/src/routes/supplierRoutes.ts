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

const router = express.Router();

router.get("/", getSuppliers);

router.get("/:id", getSupplierById);

router.post("/", createSupplier);

router.put("/:id", updateSupplier);

router.patch("/:id/products", addProductToSupplier);

router.delete("/:id/products/:productId", removeProductFromSupplier);

router.delete("/:id", deleteSupplier);

export default router;