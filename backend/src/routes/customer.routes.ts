import express from "express";

import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerPurchase,
} from "../controllers/customer.controller";

import { getCustomerLoyaltyLedger } from "../controllers/loyalty_ledger.controller";

import { validate } from "../middleware/validate.middleware";

import {
  createCustomerSchema,
  updateCustomerSchema,
  addPurchaseHistorySchema,
} from "../validators/customer.validator";

import { loyaltyCustomerIdParamSchema } from "../validators/loyaltyLedger.validator";

const router = express.Router();

router.get("/", getCustomers);

router.get(
  "/:customerId/ledger",
  validate(loyaltyCustomerIdParamSchema),
  getCustomerLoyaltyLedger
);

router.get("/:id", getCustomerById);

router.post("/", validate(createCustomerSchema), createCustomer);

router.put("/:id", validate(updateCustomerSchema), updateCustomer);

router.patch(
  "/:id/purchase",
  validate(addPurchaseHistorySchema),
  addCustomerPurchase
);

router.delete("/:id", deleteCustomer);

export default router;