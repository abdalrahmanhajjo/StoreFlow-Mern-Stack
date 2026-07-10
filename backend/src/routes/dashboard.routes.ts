import express from "express";

import { getDashboardData } from "../controllers/dashboard.controller";

import { validate } from "../middleware/validate.middleware";

import { dashboardQuerySchema } from "../validators/dashboard.validator";

const router = express.Router();

router.get("/", validate(dashboardQuerySchema), getDashboardData);

export default router;