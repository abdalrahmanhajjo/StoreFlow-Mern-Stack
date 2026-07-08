import express from "express";

import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getLowStockProducts,
    updateProductStock,
} from "../controllers/productController";

const router = express.Router();

router.get("/low-stock", getLowStockProducts);

router.get("/", getProducts);

router.get("/:id", getProductById);

router.post("/", createProduct);

router.put("/:id", updateProduct);

router.patch("/:id/stock", updateProductStock);

router.delete("/:id", deleteProduct);

export default router;