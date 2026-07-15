import express, { Request, Response, NextFunction, RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";

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
import planRoutes from "./routes/plan.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import adminBillingRoutes from "./routes/admin/billing.routes";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import securityRoutes from "./routes/security.routes";
import emailTemplateRoutes from "./routes/email_templates.routes"

import cookieParser from "cookie-parser";
import storeRoutes from "./routes/store.routes";
import employeeRoutes from "./routes/employee.routes";

// V1 billing + webhook routes
import billingV1Routes from "./routes/v1/billing.routes";
import webhookRoutes from "./routes/v1/webhook.routes";

import { authenticate } from "./middleware/auth.middleware";
import { authorize } from "./middleware/role.middleware";
import { tenantScope } from "./middleware/tenant.middleware";
import {
    loadStore,
    requireMembership,
    requireActiveSubscription,
    requirePermission,
    requireFeature,
} from "./middleware/authorization.middleware";
import errorHandler from "./middleware/error.middleware";
import { isProduction } from "./config/env";

const app = express();

// Hosting platforms (Render, Railway, Fly, …) terminate TLS at a proxy and
// forward over http. Trusting the first proxy lets Express see the real
// protocol (req.secure → Secure cookies) and the real client IP (rate
// limiting). Harmless locally, where there is no proxy.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cookieParser());
// Middlewares — credentials:true lets the browser send the HttpOnly refresh
// cookie cross-origin, which requires an explicit origin (no wildcard).
// Outside production any localhost port is accepted, since Vite hops ports
// when 5173 is busy.
// A browser Origin never has a trailing slash, so neither must the allowed
// origin — a CLIENT_APP_URL with a stray "/" would silently fail every CORS
// check. Strip it defensively.
const allowedOrigin = (process.env.CLIENT_APP_URL ?? "http://localhost:5173").replace(/\/+$/, "");
app.use(
    cors({
        origin:
            isProduction()
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

// Webhooks must receive raw body for signature verification — mount BEFORE
// the express.json() parser so Stripe signature verification gets the raw
// payload.
app.use("/api/v1/webhooks", webhookRoutes);

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
// Workspace routes: every one requires a valid JWT, is tenant-scoped, loads
// the store, verifies store membership, and checks active subscription.
// The authorizeResource middleware maps HTTP method to resource.action:
//   GET → resource.read, POST → resource.create, PUT/PATCH → resource.update,
//   DELETE → resource.delete.
// ---------------------------------------------------------------------------

/**
 * Maps HTTP method to the CRUD action suffix.
 * HEAD/OPTIONS are treated as read.
 */
function methodAction(method: string): 'create' | 'read' | 'update' | 'delete' {
    switch (method) {
        case 'POST': return 'create';
        case 'PUT':
        case 'PATCH': return 'update';
        case 'DELETE': return 'delete';
        default: return 'read';
    }
}

/**
 * Middleware factory: returns middleware that requires the given resource
 * permission based on the HTTP method of the request.
 */
function authorizeResource(resource: string) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const action = methodAction(req.method);
        return requirePermission(`${resource}.${action}` as any)(req, _res, next);
    };
}

/**
 * Platform admins operate across tenants: tenantScope leaves req.storeId null
 * for them, so the store-membership part of the chain doesn't apply — without
 * this bypass every authChain route 500s for admins (no store to load, no
 * membership to check, no billing subscription of their own).
 */
const unlessPlatformAdmin = (mw: RequestHandler): RequestHandler =>
    (req, res, next) => (req.user?.role === 'platform_admin' ? next() : mw(req, res, next));

/**
 * Full authorization chain for a route group: authenticate → tenant-scope →
 * load store → verify membership → check active subscription → check
 * resource permission.
 */
function authChain(resource: string) {
    return [
        authenticate,
        tenantScope,
        unlessPlatformAdmin(loadStore),
        unlessPlatformAdmin(requireMembership),
        unlessPlatformAdmin(requireActiveSubscription),
        unlessPlatformAdmin(authorizeResource(resource)),
    ];
}

// API routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes); // has its own authenticate/authorize chain
app.use("/api/stores", storeRoutes); // has its own authenticate/authorize chain
app.use("/api/security", securityRoutes); // admin-only, own chain

app.use("/api/categories", ...authChain('category'), categoryRoutes);
app.use("/api/products", ...authChain('product'), productRoutes);
app.use("/api/customers", ...authChain('customer'), customerRoutes);
app.use("/api/loyalty-ledger", ...authChain('customer'), loyaltyLedgerRoutes);
app.use("/api/sales", ...authChain('sale'), saleRoutes);
app.use("/api/stock-adjustments", ...authChain('inventory'), stockAdjustmentRoutes);
// Suppliers & purchase orders are a paid-plan capability (Pro and up) — the
// plan gate mirrors what the pricing page advertises.
app.use("/api/suppliers", ...authChain('supplier'), requireFeature('supplierManagement'), supplierRoutes);
app.use("/api/purchase-orders", ...authChain('purchase_order'), requireFeature('supplierManagement'), purchaseOrderRoutes);
app.use("/api/store-settings", ...authChain('settings'), storeSettingRoutes);
app.use("/api/inventory", ...authChain('inventory'), inventoryRoutes);
app.use("/api/audit-logs", ...authChain('audit_log'), auditLogRoutes);
// Reporting requires the analytics plan feature (Pro and up).
app.use("/api/reports", ...authChain('report'), requireFeature('analytics'), reportsRoutes);
app.use("/api/dashboard", ...authChain('analytics'), dashboardRoutes);

app.use("/api/email-templates", emailTemplateRoutes); 

app.use("/api/plans", planRoutes); // admin-only, own chain
app.use("/api/subscriptions", subscriptionRoutes); // own auth chain
app.use("/api/admin/billing", adminBillingRoutes); // admin billing controls

// V1 billing API
app.use("/api/v1/billing", billingV1Routes);

// ---- serve built frontend in production ----
if (isProduction()) {
    const frontendDist = path.join(__dirname, "../../frontend/web/dist");
    app.use(express.static(frontendDist));

    // SPA catch-all: any non-API request serves index.html so React Router
    // handles the path client-side (prevents 404 on refresh/direct nav).
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith("/api")) return next(); // fall through to API 404
        res.sendFile(path.join(frontendDist, "index.html"));
    });
}

// Not found route (API only)
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// Global error handler — normalises Zod/Mongo/AppError into clean JSON and
// never leaks a stack trace to the client. Must be last.
app.use(errorHandler);

export default app;
