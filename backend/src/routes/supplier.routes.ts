import express from "express";

import {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addProductToSupplier,
    removeProductFromSupplier,
} from "../controllers/supplier.controller";

import { validate } from "../middleware/validate.middleware";

import {
    supplierIdParamSchema,
    supplierProductParamSchema,
    createSupplierSchema,
    updateSupplierSchema,
    addProductToSupplierSchema,
} from "../validators/supplier.validator";

const router = express.Router();

router.get("/", getSuppliers);

router.get(
    "/:id",
    validate(supplierIdParamSchema),
    getSupplierById
);

router.post(
    "/",
    validate(createSupplierSchema),
    createSupplier
);

router.put(
    "/:id",
    validate(supplierIdParamSchema),
    validate(updateSupplierSchema),
    updateSupplier
);

router.patch(
    "/:id/products",
    validate(supplierIdParamSchema),
    validate(addProductToSupplierSchema),
    addProductToSupplier
);

router.delete(
    "/:id/products/:productId",
    validate(supplierProductParamSchema),
    removeProductFromSupplier
);

router.delete(
    "/:id",
    validate(supplierIdParamSchema),
    deleteSupplier
);

export default router;