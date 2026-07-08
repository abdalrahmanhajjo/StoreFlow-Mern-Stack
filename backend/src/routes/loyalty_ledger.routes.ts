import express from "express";

import {
    getLoyaltyLedgers,
    getLoyaltyLedgerById,
    getCustomerLoyaltyLedger,
    earnPoints,
    redeemPoints,
    adjustPoints,
    deleteLoyaltyLedger,
} from "../controllers/loyaltyLedgerController";

const router = express.Router();

router.get("/", getLoyaltyLedgers);

router.get("/customer/:customerId", getCustomerLoyaltyLedger);

router.get("/:id", getLoyaltyLedgerById);

router.post("/earn", earnPoints);

router.post("/redeem", redeemPoints);

router.post("/adjust", adjustPoints);

router.delete("/:id", deleteLoyaltyLedger);

export default router;