import express from "express";

import {
    getProducts,
    getProductById,
    getLowStockProducts,
    createProduct,
    updateProduct,
    updateProductStock,
    deleteProduct,
} from "../controllers/product.controller";


import { validate } from "../middleware/validate.middleware";
import { requirePlanLimit } from "../middleware/authorization.middleware";
import Product from "../models/product.model";

import {
    createProductSchema,
    updateProductSchema,
    updateProductStockSchema,
} from "../validators/product.validator";

const router = express.Router();

router.get("/low-stock", getLowStockProducts);

router.get("/", getProducts);

router.get("/:id", getProductById);

// Plan limit: Free allows 50 products per store; paid plans are unlimited.
router.post(
    "/",
    requirePlanLimit('productsPerStore', (req) =>
        Product.countDocuments({ storeId: req.storeId, isActive: true })
    ),
    validate(createProductSchema),
    createProduct
);

router.put("/:id", validate(updateProductSchema), updateProduct);

router.patch(
    "/:id/stock",
    validate(updateProductStockSchema),
    updateProductStock
);

router.delete("/:id", deleteProduct);

export default router;