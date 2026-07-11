import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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

import cookieParser from "cookie-parser";
import storeRoutes from "./routes/store.routes";

import { authenticate } from "./middleware/auth.middleware";
import { authorize } from "./middleware/role.middleware";
import { tenantScope } from "./middleware/tenant.middleware";

const app = express();

app.use(helmet());
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
app.use(express.json({ limit: "3mb" })); // logos ship as data URLs

// ---------------------------------------------------------------------------
// Rate limits (in-memory — swap the store for Redis when running replicated).
// The OTP limiter is the one that matters: codes are 6 digits, so guessing
// must be throttled per IP on top of expiry + single-use.
// ---------------------------------------------------------------------------
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." },
});

app.use("/api/auth/verify-email-code", otpLimiter);
app.use("/api/auth/verify-reset-code", otpLimiter);
app.use("/api/auth/reset-password", otpLimiter);
app.use("/api/auth/forgot-password", otpLimiter);
app.use("/api/auth/resend-verification-code", otpLimiter);

// Test route
app.get("/", (req: Request, res: Response) => {
    res.send("StoreFlow API is running");
});

// ---------------------------------------------------------------------------
// Workspace routes: every one requires a valid JWT and is tenant-scoped —
// tenantScope resolves req.storeId from the token (null = platform admin).
// managerWrites additionally restricts non-GET methods to owner/manager and
// requires a store-scoped account, so cashiers can look but not touch and
// nothing can ever be written without a tenant.
// ---------------------------------------------------------------------------
const managerWrites = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET") return next();
    if (!req.storeId) {
        return res.status(403).json({
            success: false,
            message: "A store-scoped account is required for this action",
        });
    }
    return authorize("owner", "manager")(req, res, next);
};

/** Non-GET requests must carry a store scope (cashier-writable resources). */
const storeWrites = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET" || req.storeId) return next();
    return res.status(403).json({
        success: false,
        message: "A store-scoped account is required for this action",
    });
};

/** Reads open to any store user, but writes are owner-only — used for
 * finance/business config (store settings) that managers must not change. */
const ownerWrites = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === "GET") return next();
    if (!req.storeId) {
        return res.status(403).json({
            success: false,
            message: "A store-scoped account is required for this action",
        });
    }
    return authorize("owner")(req, res, next);
};

// API routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes); // has its own authenticate/authorize chain
app.use("/api/stores", storeRoutes); // has its own authenticate/authorize chain
app.use("/api/security", securityRoutes); // admin-only, own chain

app.use("/api/categories", authenticate, tenantScope, managerWrites, categoryRoutes);
app.use("/api/products", authenticate, tenantScope, managerWrites, productRoutes);
app.use("/api/customers", authenticate, tenantScope, storeWrites, customerRoutes);
app.use("/api/loyalty-ledger", authenticate, tenantScope, storeWrites, loyaltyLedgerRoutes);
app.use("/api/sales", authenticate, tenantScope, storeWrites, saleRoutes);
app.use("/api/stock-adjustments", authenticate, tenantScope, managerWrites, stockAdjustmentRoutes);
app.use("/api/suppliers", authenticate, tenantScope, managerWrites, supplierRoutes);
app.use("/api/purchase-orders", authenticate, tenantScope, managerWrites, purchaseOrderRoutes);
app.use("/api/store-settings", authenticate, tenantScope, ownerWrites, storeSettingRoutes);
app.use("/api/audit-logs", authenticate, tenantScope, authorize("platform_admin", "owner", "manager"), auditLogRoutes);
app.use("/api/inventory", authenticate, tenantScope, managerWrites, inventoryRoutes);
app.use("/api/reports", authenticate, tenantScope, reportsRoutes);
app.use("/api/dashboard", authenticate, tenantScope, dashboardRoutes);

// Not found route
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

export default app;
