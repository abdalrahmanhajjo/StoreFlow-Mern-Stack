import express from "express";

import {
    getReportsSummary,
    getTopProductsReport,
    getCashierPerformanceReport,
} from "../controllers/reports.controller";

import { validate } from "../middleware/validate.middleware";

import {
    reportsSummaryQuerySchema,
    topProductsReportQuerySchema,
    cashierPerformanceReportQuerySchema,
} from "../validators/reports.validator";

const router = express.Router();

router.get("/ping", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Reports API is working",
    });
});

router.get(
    "/summary",
    validate(reportsSummaryQuerySchema),
    getReportsSummary
);

router.get(
    "/top-products",
    validate(topProductsReportQuerySchema),
    getTopProductsReport
);

router.get(
    "/cashier-performance",
    validate(cashierPerformanceReportQuerySchema),
    getCashierPerformanceReport
);

export default router;