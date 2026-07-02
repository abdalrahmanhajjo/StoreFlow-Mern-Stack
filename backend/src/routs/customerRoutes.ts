import express from "express";

import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerPurchase,
} from "../controllers/customerController";

const router = express.Router();

router.get("/", getCustomers);

router.get("/:id", getCustomerById);

router.post("/", createCustomer);

router.put("/:id", updateCustomer);

router.patch("/:id/purchase", addCustomerPurchase);

router.delete("/:id", deleteCustomer);

export default router;