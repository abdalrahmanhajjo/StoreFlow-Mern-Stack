import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Plan } from "../models/plan.model";
import { Store } from "../models/store.model";
import { AppError } from "../utils/error.utils";
import { pickAllowed, stripOperators } from "../utils/security.utils";

const PLAN_UPDATE_FIELDS = ['name', 'billing', 'description', 'features', 'limits', 'isActive', 'isPublic', 'displayOrder'] as const;

// 1. CREATE PLAN
export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const existing = await Plan.findOne({ slug: req.body.slug });
        if (existing) {
            return next(new AppError("A plan with this slug already exists.", 409));
        }

        const plan = await Plan.create(pickAllowed(stripOperators(req.body), PLAN_UPDATE_FIELDS));

        res.status(201).json({
            success: true,
            message: "Plan created",
            data: plan,
        });
    } catch (error) {
        next(error);
    }
};

// 2. LIST PLANS (includes live store counts, for the plan cards)
export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const plans = await Plan.find().sort({ displayOrder: 1 });

        const data = plans.map((p) => ({
            ...p.toObject(),
            storeCount: 0, // TODO: aggregate from Subscription model
        }));

        res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        next(error);
    }
};

// 3. GET ONE PLAN
export const getPlanById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Plan ID format", 400));
        }

        const plan = await Plan.findById(id);
        if (!plan) {
            return next(new AppError("Plan not found", 404));
        }

        res.status(200).json({
            success: true,
            data: plan,
        });
    } catch (error) {
        next(error);
    }
};

// 4. UPDATE PLAN (price, features, limits, popular flag, etc. — "Edit" button)
export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Plan ID format", 400));
        }

        if (req.body.slug) {
            const clash = await Plan.findOne({ slug: req.body.slug, _id: { $ne: id } });
            if (clash) {
                return next(new AppError("A plan with this slug already exists.", 409));
            }
        }

        const plan = await Plan.findByIdAndUpdate(id, pickAllowed(stripOperators(req.body), PLAN_UPDATE_FIELDS), {
            new: true,
            runValidators: true,
        });

        if (!plan) {
            return next(new AppError("Plan not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "Plan updated",
            data: plan,
        });
    } catch (error) {
        next(error);
    }
};

// 5. DELETE PLAN (blocked while any store is still on it — matches the greyed-out
//    "Delete plan" button on Free in the screenshot, since 7 stores use it)
export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Plan ID format", 400));
        }

        const storeCount = 0; // TODO: check Subscription model once migrated
        if (storeCount > 0) {
            return next(
                new AppError(
                    `Cannot delete: ${storeCount} store(s) are currently on this plan.`,
                    400
                )
            );
        }

        const plan = await Plan.findByIdAndDelete(id);
        if (!plan) {
            return next(new AppError("Plan not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "Plan deleted",
        });
    } catch (error) {
        next(error);
    }
};

// 6. ASSIGN A PLAN TO A STORE ("Assign plan to store" panel)
export const assignPlanToStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { storeId } = req.params as { storeId: string };
        const { planId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return next(new AppError("Invalid Store ID format", 400));
        }
        if (!mongoose.Types.ObjectId.isValid(planId)) {
            return next(new AppError("Invalid Plan ID format", 400));
        }

        const plan = await Plan.findById(planId);
        if (!plan) {
            return next(new AppError("Plan not found", 404));
        }

        // Dot-notation update — touches only this nested field, leaves
        // trialEndsAt/status untouched (a { subscription: { planId } } object
        // literal would overwrite the whole subscription document instead).
        const store = await Store.findByIdAndUpdate(
            storeId,
            { planId },
            { new: true, runValidators: true }
        ).populate("planId", "name billing");

        if (!store) {
            return next(new AppError("Store not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "Plan assigned",
            data: store,
        });
    } catch (error) {
        next(error);
    }
};