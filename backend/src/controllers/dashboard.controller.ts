import { Request, Response } from "express";
import Sale from "../models/sale.model";
import Customer from "../models/customer.model";
import Product from "../models/product.model";
import StoreSetting from "../models/store_setting.model";
import { tenantFilter, tenantMatch } from "../utils/tenant.utils";

export const getDashboardData = async (req: Request, res: Response) => {
    try {
        const recentLimit = Number(req.query.recentLimit) || 5;

        const setting = await StoreSetting.findOne({ ...tenantFilter(req), isActive: true });

        const lowStockThreshold = setting?.lowStockThreshold || 5;

        const revenueResult = await Sale.aggregate([
            {
                $match: {
                    ...tenantMatch(req),
                    isActive: true,
                    status: "completed",
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$total",
                    },
                    totalSales: {
                        $sum: 1,
                    },
                },
            },
        ]);

        const revenueData = revenueResult[0] || {
            totalRevenue: 0,
            totalSales: 0,
        };

        const totalCustomers = await Customer.countDocuments({
            ...tenantFilter(req),
            isActive: true,
        });

        const totalProducts = await Product.countDocuments({
            ...tenantFilter(req),
            isActive: true,
        });

        // A product is low-stock when its on-hand quantity is at or below its
        // own reorder threshold; products without a per-item threshold fall
        // back to the store-wide setting. (The old aggregation read
        // `stockQuantity`/`stock`, fields that don't exist on the Product
        // model, so every product counted as low-stock.)
        const lowStockProducts = await Product.aggregate([
            {
                $match: {
                    ...tenantMatch(req),
                    isActive: true,
                },
            },
            {
                $addFields: {
                    effectiveThreshold: {
                        $ifNull: ["$reorderThreshold", lowStockThreshold],
                    },
                },
            },
            {
                $match: {
                    $expr: {
                        $lte: ["$quantity", "$effectiveThreshold"],
                    },
                },
            },
            {
                $count: "count",
            },
        ]);

        const lowStockCount = lowStockProducts[0]?.count || 0;

        const recentSales = await Sale.find({
            ...tenantFilter(req),
            isActive: true,
        })
            .sort({ createdAt: -1 })
            .limit(recentLimit)
            .select(
                "invoiceNumber cashierName total paymentMethod status createdAt"
            );

        res.status(200).json({
            success: true,
            message: "Dashboard data retrieved successfully",
            data: {
                kpis: {
                    totalRevenue: revenueData.totalRevenue,
                    totalSales: revenueData.totalSales,
                    totalCustomers,
                    totalProducts,
                    lowStockCount,
                },
                recentSales,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve dashboard data",
            error: error.message,
        });
    }
};