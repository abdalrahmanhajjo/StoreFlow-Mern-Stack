import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Plan } from "../models/plan.model";
import { Subscription } from "../models/subscription.model";
import { AppError } from "../utils/error.utils";
import { pickAllowed, stripOperators } from "../utils/security.utils";

// Admin CRUD for the canonical billing plans — the same documents the pricing
// page, registration, and the subscription engine all read. One catalog.

const PLAN_UPDATE_FIELDS = [
    'name', 'description', 'billing', 'features', 'limits',
    'isActive', 'isPublic', 'isRecommended', 'displayOrder',
] as const;

/** Live subscription count per plan (active + trialing). */
async function subscriberCounts(): Promise<Map<string, number>> {
    const rows = await Subscription.aggregate([
        { $match: { status: { $in: ['active', 'trialing'] } } },
        { $group: { _id: '$plan', n: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r: { _id: mongoose.Types.ObjectId; n: number }) => [String(r._id), r.n]));
}

// 1. CREATE PLAN
export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = pickAllowed(stripOperators(req.body), [...PLAN_UPDATE_FIELDS, 'code'] as any) as Record<string, unknown>;
        const code = String(body.code ?? '').toLowerCase();

        const existing = await Plan.findOne({ code });
        if (existing) {
            return next(new AppError("A plan with this code already exists.", 409));
        }

        const plan = await Plan.create({
            ...body,
            code,
            publicId: `plan_${code}`,
            supportedIntervals: ['monthly', 'yearly'],
            version: 1,
        });

        res.status(201).json({
            success: true,
            message: "Plan created",
            data: { ...plan.toObject(), subscriberCount: 0 },
        });
    } catch (error) {
        next(error);
    }
};

// 2. LIST PLANS (all, including unpublished — with live subscriber counts)
export const getPlans = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const [plans, counts] = await Promise.all([
            Plan.find().sort({ displayOrder: 1, 'billing.monthlyPriceMinor': 1 }),
            subscriberCounts(),
        ]);

        const data = plans.map((p) => ({
            ...p.toObject(),
            subscriberCount: counts.get(String(p._id)) ?? 0,
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

// 4. UPDATE PLAN (price, features, limits, visibility — "Edit" button / matrix)
export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Plan ID format", 400));
        }

        const plan = await Plan.findByIdAndUpdate(id, pickAllowed(stripOperators(req.body), PLAN_UPDATE_FIELDS), {
            new: true,
            runValidators: true,
        });

        if (!plan) {
            return next(new AppError("Plan not found", 404));
        }

        const counts = await subscriberCounts();
        res.status(200).json({
            success: true,
            message: "Plan updated",
            data: { ...plan.toObject(), subscriberCount: counts.get(String(plan._id)) ?? 0 },
        });
    } catch (error) {
        next(error);
    }
};

// 5. DELETE PLAN — refused while ANY subscription (any status) references it,
//    so billing history never points at a missing plan document.
export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid Plan ID format", 400));
        }

        const inUse = await Subscription.countDocuments({ plan: id });
        if (inUse > 0) {
            return next(new AppError(
                `Cannot delete: ${inUse} subscription(s) reference this plan. Unpublish it instead (set it inactive).`,
                409,
            ));
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
