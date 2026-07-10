import { Request, Response } from "express";
import Sale from "../models/sale.model";
import Customer from "../models/customer.model";

const buildDateFilter = (startDate?: string, endDate?: string) => {
    const dateFilter: any = {};

    if (startDate || endDate) {
        dateFilter.createdAt = {};

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            dateFilter.createdAt.$gte = start;
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = end;
        }
    }

    return dateFilter;
};

export const getReportsSummary = async (req: Request, res: Response) => {
    try {
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        const dateFilter = buildDateFilter(startDate, endDate);

        const completedSalesFilter = {
            isActive: true,
            status: "completed",
            ...dateFilter,
        };

        const refundSalesFilter = {
            isActive: true,
            status: {
                $in: ["voided", "refunded"],
            },
            ...dateFilter,
        };

        const revenueSummary = await Sale.aggregate([
            {
                $match: completedSalesFilter,
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: "$total",
                    },
                    invoiceCount: {
                        $sum: 1,
                    },
                    totalDiscount: {
                        $sum: "$discount",
                    },
                    totalTax: {
                        $sum: "$taxAmount",
                    },
                },
            },
        ]);

        const refundSummary = await Sale.aggregate([
            {
                $match: refundSalesFilter,
            },
            {
                $group: {
                    _id: null,
                    refundCount: {
                        $sum: 1,
                    },
                    refundAmount: {
                        $sum: "$total",
                    },
                },
            },
        ]);

        const newCustomers = await Customer.countDocuments({
            isActive: true,
            ...dateFilter,
        });

        const revenueData = revenueSummary[0] || {
            totalRevenue: 0,
            invoiceCount: 0,
            totalDiscount: 0,
            totalTax: 0,
        };

        const refundData = refundSummary[0] || {
            refundCount: 0,
            refundAmount: 0,
        };

        res.status(200).json({
            success: true,
            message: "Reports summary retrieved successfully",
            data: {
                dateRange: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                },
                revenue: revenueData.totalRevenue,
                invoices: revenueData.invoiceCount,
                refunds: {
                    count: refundData.refundCount,
                    amount: refundData.refundAmount,
                },
                newCustomers,
                totals: {
                    discount: revenueData.totalDiscount,
                    tax: revenueData.totalTax,
                },
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get reports summary",
            error: error.message,
        });
    }
};

export const getTopProductsReport = async (req: Request, res: Response) => {
    try {
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const sortBy = (req.query.sortBy as string | undefined) || "quantity";
        const limit = Number(req.query.limit) || 10;

        const dateFilter = buildDateFilter(startDate, endDate);

        const matchFilter: any = {
            isActive: true,
            status: "completed",
            ...dateFilter,
        };

        const sortField = sortBy === "revenue" ? "revenue" : "quantitySold";

        const topProducts = await Sale.aggregate([
            {
                $match: matchFilter,
            },
            {
                $unwind: "$items",
            },
            {
                $group: {
                    _id: "$items.productId",
                    productName: {
                        $first: "$items.productName",
                    },
                    sku: {
                        $first: "$items.sku",
                    },
                    quantitySold: {
                        $sum: "$items.quantity",
                    },
                    revenue: {
                        $sum: "$items.subtotal",
                    },
                    invoiceCount: {
                        $sum: 1,
                    },
                },
            },
            {
                $sort: {
                    [sortField]: -1,
                },
            },
            {
                $limit: limit,
            },
            {
                $project: {
                    _id: 0,
                    productId: "$_id",
                    productName: 1,
                    sku: 1,
                    quantitySold: 1,
                    revenue: 1,
                    invoiceCount: 1,
                },
            },
        ]);

        res.status(200).json({
            success: true,
            message: "Top products report retrieved successfully",
            data: {
                dateRange: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                },
                sortBy,
                limit,
                products: topProducts,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get top products report",
            error: error.message,
        });
    }
};

export const getCashierPerformanceReport = async (
    req: Request,
    res: Response
) => {
    try {
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        const dateFilter = buildDateFilter(startDate, endDate);

        const cashierPerformance = await Sale.aggregate([
            {
                $match: {
                    isActive: true,
                    status: "completed",
                    ...dateFilter,
                },
            },
            {
                $unwind: "$items",
            },
            {
                $group: {
                    _id: "$cashierName",
                    invoiceIds: {
                        $addToSet: "$_id",
                    },
                    totalRevenue: {
                        $sum: "$items.subtotal",
                    },
                    totalItemsSold: {
                        $sum: "$items.quantity",
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    cashierName: "$_id",
                    invoiceCount: {
                        $size: "$invoiceIds",
                    },
                    totalRevenue: 1,
                    totalItemsSold: 1,
                    averageSaleValue: {
                        $cond: [
                            {
                                $eq: [
                                    {
                                        $size: "$invoiceIds",
                                    },
                                    0,
                                ],
                            },
                            0,
                            {
                                $divide: [
                                    "$totalRevenue",
                                    {
                                        $size: "$invoiceIds",
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $sort: {
                    totalRevenue: -1,
                },
            },
        ]);

        res.status(200).json({
            success: true,
            message: "Cashier performance report retrieved successfully",
            data: {
                dateRange: {
                    startDate: startDate || null,
                    endDate: endDate || null,
                },
                cashiers: cashierPerformance,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get cashier performance report",
            error: error.message,
        });
    }
};