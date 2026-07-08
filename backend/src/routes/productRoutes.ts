import express from "express";

import {
    getProducts,
    getProductById,
    getLowStockProducts,
    createProduct,
    updateProduct,
    updateProductStock,
    deleteProduct,
} from "../controllers/productController";

import { validate } from "../middleware/validate.middleware";

import {
    createProductSchema,
    updateProductSchema,
    updateProductStockSchema,
} from "../validators/product.validator";

const router = express.Router();

router.get("/low-stock", getLowStockProducts);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post("/", validate(createProductSchema), createProduct);

router.put("/:id", validate(updateProductSchema), updateProduct);

router.patch(
    "/:id/stock",
    validate(updateProductStockSchema),
    updateProductStock
);

router.delete("/:id", deleteProduct);

export default router;