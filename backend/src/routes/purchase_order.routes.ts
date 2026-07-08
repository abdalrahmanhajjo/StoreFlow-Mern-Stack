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

const router = express.Router();

router.get("/", getPurchaseOrders);

router.get("/supplier/:supplierId", getPurchaseOrdersBySupplier);

router.post("/", createPurchaseOrder);

router.post("/:id/receive", receivePurchaseOrder);

router.patch("/:id/receive", receivePurchaseOrder);

router.patch("/:id/cancel", cancelPurchaseOrder);

router.get("/:id", getPurchaseOrderById);

router.put("/:id", updatePurchaseOrder);

router.delete("/:id", deletePurchaseOrder);

export default router;