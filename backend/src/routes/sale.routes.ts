import express from "express";

import {
    getSales,
    getSaleById,
    getInvoiceByNumber,
    createSale,
    voidSale,
} from "../controllers/sale.controller";

const router = express.Router();

router.get("/", getSales);

router.get("/invoice/:invoiceNumber", getInvoiceByNumber);

router.get("/:id", getSaleById);

router.post("/", createSale);

router.patch("/:id/void", voidSale);

export default router;