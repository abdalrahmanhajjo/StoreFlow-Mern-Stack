import express from "express";

import {
    getSales,
    getSaleById,
    getInvoiceByNumber,
    createSale,
    voidSale,
    getSaleReceipt,
} from "../controllers/sale.controller";

import { validate } from "../middleware/validate.middleware";

import {
    createSaleSchema,
    saleIdParamSchema,
    invoiceNumberParamSchema,
} from "../validators/sale.validator";

const router = express.Router();

router.get("/", getSales);

router.get(
    "/invoice/:invoiceNumber",
    validate(invoiceNumberParamSchema),
    getInvoiceByNumber
);

router.get(
    "/:id/receipt",
    validate(saleIdParamSchema),
    getSaleReceipt
);

router.get(
    "/:id",
    validate(saleIdParamSchema),
    getSaleById
);

router.post(
    "/",
    validate(createSaleSchema),
    createSale
);

router.patch(
    "/:id/void",
    validate(saleIdParamSchema),
    voidSale
);

export default router;