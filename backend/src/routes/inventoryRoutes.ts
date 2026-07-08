import express from "express";
import Product from "../models/Product";
import StockAdjustment from "../models/StockAdjustment";

const router = express.Router();

// GET /api/inventory/test
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Inventory route is working",
  });
});

// GET /api/inventory/low-stock
router.get("/low-stock", async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: {
        $lte: ["$quantity", "$reorderThreshold"],
      },
    })
      .populate("categoryId", "name description")
      .sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      message: "Low stock products retrieved successfully",
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get low stock products",
      error: error.message,
    });
  }
});

// GET /api/inventory/history
router.get("/history", async (req, res) => {
  try {
    const history = await StockAdjustment.find({
      isActive: true,
    })
      .populate("productId", "name sku price quantity reorderThreshold")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: history.length,
      message: "Inventory adjustment history retrieved successfully",
      data: history,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get inventory history",
      error: error.message,
    });
  }
});

// POST /api/inventory/adjust
router.post("/adjust", async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Inventory adjust route exists. Keep your adjustInventory controller later.",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;