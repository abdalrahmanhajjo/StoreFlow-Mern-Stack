import express from "express";

import {
    getStockAdjustments,
    getStockAdjustmentById,
    createStockAdjustment,
    deleteStockAdjustment,
} from "../controllers/stock_adjustment.controller";

import { validate } from "../middleware/validate.middleware";

import {
    stockAdjustmentIdParamSchema,
    createStockAdjustmentSchema,
    updateStockAdjustmentSchema,
    stockAdjustmentQuerySchema,
} from "../validators/stockAdjustment.validator";

const router = express.Router();

router.get(
    "/",
    validate(stockAdjustmentQuerySchema),
    getStockAdjustments
);

router.get(
    "/:id",
    validate(stockAdjustmentIdParamSchema),
    getStockAdjustmentById
);

router.post(
    "/",
    validate(createStockAdjustmentSchema),
    createStockAdjustment
);

router.put(
    "/:id",
    validate(stockAdjustmentIdParamSchema),
    validate(updateStockAdjustmentSchema),
   
);

router.delete(
    "/:id",
    validate(stockAdjustmentIdParamSchema),
    deleteStockAdjustment
);

export default router;