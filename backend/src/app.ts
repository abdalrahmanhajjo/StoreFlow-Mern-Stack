import express, { Request, Response } from "express";
import cors from "cors";

import categoryRoutes from "./routes/categoryRoutes";
import productRoutes from "./routes/productRoutes";
import customerRoutes from "./routes/customerRoutes";
import loyaltyLedgerRoutes from "./routes/loyaltyLedgerRoutes";
import saleRoutes from "./routes/saleRoutes";
import stockAdjustmentRoutes from "./routes/stockAdjustmentRoutes";
import supplierRoutes from "./routes/supplierRoutes";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes";
import storeSettingRoutes from "./routes/storeSettingRoutes";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req: Request, res: Response) => {
    res.send("StoreFlow API is running");
});

// API routes
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/loyalty-ledger", loyaltyLedgerRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/store-settings", storeSettingRoutes);

// Not found route
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

export default app;