import express from "express";

import {
    getPurchaseOrders,
    getPurchaseOrderById,
    getPurchaseOrdersBySupplier,
    createPurchaseOrder,
    updatePurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
    deletePurchaseOrder,
} from "../controllers/purchase_order.controller";

import { validate } from "../middleware/validate.middleware";

import {
    purchaseOrderIdParamSchema,
    supplierIdParamSchema,
    createPurchaseOrderSchema,
    updatePurchaseOrderSchema,
    receivePurchaseOrderSchema,
    cancelPurchaseOrderSchema,
} from "../validators/purchaseOrder.validator";

const router = express.Router();

router.get("/", getPurchaseOrders);

router.get(
    "/supplier/:supplierId",
    validate(supplierIdParamSchema),
    getPurchaseOrdersBySupplier
);

router.post(
    "/",
    validate(createPurchaseOrderSchema),
    createPurchaseOrder
);

router.post(
    "/:id/receive",
    validate(receivePurchaseOrderSchema),
    receivePurchaseOrder
);

router.patch(
    "/:id/receive",
    validate(receivePurchaseOrderSchema),
    receivePurchaseOrder
);

router.patch(
    "/:id/cancel",
    validate(cancelPurchaseOrderSchema),
    cancelPurchaseOrder
);

router.get(
    "/:id",
    validate(purchaseOrderIdParamSchema),
    getPurchaseOrderById
);

router.put(
    "/:id",
    validate(purchaseOrderIdParamSchema),
    validate(updatePurchaseOrderSchema),
    updatePurchaseOrder
);

router.delete(
    "/:id",
    validate(purchaseOrderIdParamSchema),
    deletePurchaseOrder
);

export default router;