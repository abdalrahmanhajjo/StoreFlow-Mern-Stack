import express, { Request, Response } from "express";
import cors from "cors";

import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import customerRoutes from "./routes/customer.routes";
import loyaltyLedgerRoutes from "./routes/loyalty_ledger.routes";
import saleRoutes from "./routes/sale.routes";
import stockAdjustmentRoutes from "./routes/stock_adjustment.routes";
import supplierRoutes from "./routes/supplier.routes";
import purchaseOrderRoutes from "./routes/purchase_order.routes";
import storeSettingRoutes from "./routes/store_setting.routes";
import auditLogRoutes from "./routes/audit_log.routes";
import inventoryRoutes from "./routes/inventory.routes";
import reportsRoutes from "./routes/reports.routes";
import dashboardRoutes from "./routes/dashboard.routes";


import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import securityRoutes from "./routes/security.routes";

import cookieParser from 'cookie-parser';
import storeRoutes from "./routes/store.routes";


const app = express();

app.use(cookieParser());
// Middlewares — credentials:true lets the browser send the HttpOnly refresh
// cookie cross-origin, which requires an explicit origin (no wildcard).
// Outside production any localhost port is accepted, since Vite hops ports
// when 5173 is busy.
const allowedOrigin = process.env.CLIENT_APP_URL ?? "http://localhost:5173";
app.use(
    cors({
        origin:
            process.env.NODE_ENV === "production"
                ? allowedOrigin
                : (origin, cb) =>
                      cb(
                          null,
                          !origin ||
                              origin === allowedOrigin ||
                              /^http:\/\/localhost:\d+$/.test(origin)
                      ),
        credentials: true,
    })
);
app.use(express.json());

// Test route
app.get("/", (req: Request, res: Response) => {
    res.send("StoreFlow API is running");
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/loyalty-ledger", loyaltyLedgerRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/store-settings", storeSettingRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Not found route
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

export default app;