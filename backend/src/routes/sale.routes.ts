import express from "express";

import {
    getSales,
    getSaleById,
    getInvoiceByNumber,
    createSale,
    voidSale,
    getSaleReceipt,
} from "../controllers/saleController";

const router = express.Router();

router.get("/", getSales);

router.get("/invoice/:invoiceNumber", getInvoiceByNumber);

router.get("/:id/receipt", getSaleReceipt);

router.get("/:id", getSaleById);

router.post("/", createSale);

router.patch("/:id/void", voidSale);

export default router;