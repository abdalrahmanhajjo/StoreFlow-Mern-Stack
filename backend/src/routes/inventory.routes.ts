import express from "express";

import {
  adjustInventory,
  getLowStockInventory,
  getInventoryHistory,
} from "../controllers/inventory.controller";

const router = express.Router();

// GET /api/inventory/test
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory route is working",
  });
});

// GET /api/inventory/low-stock — tenant-scoped low-stock products.
router.get("/low-stock", getLowStockInventory);

// GET /api/inventory/history — tenant-scoped adjustment history.
router.get("/history", getInventoryHistory);

// POST /api/inventory/adjust — real, tenant-scoped stock adjustment.
router.post("/adjust", adjustInventory);

export default router;
