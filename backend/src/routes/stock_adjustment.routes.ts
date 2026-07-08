import express from "express";

import {
    getStockAdjustments,
    getStockAdjustmentById,
    getProductStockAdjustments,
    createStockAdjustment,
    deleteStockAdjustment,
} from "../controllers/stockAdjustmentController";

const router = express.Router();

router.get("/", getStockAdjustments);

router.get("/product/:productId", getProductStockAdjustments);

router.get("/:id", getStockAdjustmentById);

router.post("/", createStockAdjustment);

router.delete("/:id", deleteStockAdjustment);

export default router;