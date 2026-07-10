import express from "express";

import {
    getLoyaltyLedgers,
    getLoyaltyLedgerById,
    getCustomerLoyaltyLedger,
    earnPoints,
    redeemPoints,
    adjustPoints,
    deleteLoyaltyLedger,
} from "../controllers/loyalty_ledger.controller";

import { validate } from "../middleware/validate.middleware";

import {
    loyaltyLedgerIdParamSchema,
    loyaltyCustomerIdParamSchema,
    loyaltyLedgerQuerySchema,
    earnPointsSchema,
    redeemPointsSchema,
    adjustPointsSchema,
} from "../validators/loyaltyLedger.validator";

const router = express.Router();

router.get(
    "/",
    validate(loyaltyLedgerQuerySchema),
    getLoyaltyLedgers
);

router.get(
    "/customer/:customerId",
    validate(loyaltyCustomerIdParamSchema),
    getCustomerLoyaltyLedger
);

router.post(
    "/earn",
    validate(earnPointsSchema),
    earnPoints
);

router.post(
    "/redeem",
    validate(redeemPointsSchema),
    redeemPoints
);

router.post(
    "/adjust",
    validate(adjustPointsSchema),
    adjustPoints
);

router.get(
    "/:id",
    validate(loyaltyLedgerIdParamSchema),
    getLoyaltyLedgerById
);

router.delete(
    "/:id",
    validate(loyaltyLedgerIdParamSchema),
    deleteLoyaltyLedger
);

export default router;