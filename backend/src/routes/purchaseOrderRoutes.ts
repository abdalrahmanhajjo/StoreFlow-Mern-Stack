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
} from "../controllers/purchaseOrderController";

const router = express.Router();

router.get("/", getPurchaseOrders);

router.get("/supplier/:supplierId", getPurchaseOrdersBySupplier);

router.get("/:id", getPurchaseOrderById);

router.post("/", createPurchaseOrder);

router.put("/:id", updatePurchaseOrder);

router.patch("/:id/receive", receivePurchaseOrder);

router.patch("/:id/cancel", cancelPurchaseOrder);

router.delete("/:id", deletePurchaseOrder);

export default router;