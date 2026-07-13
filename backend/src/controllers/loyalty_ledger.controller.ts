import { Request, Response } from "express";
import mongoose from "mongoose";
import LoyaltyLedger from "../models/loyalty_ledger.model";
import Customer from "../models/customer.model";
import { calculateLoyaltyTier } from "../utils/loyalty_tier.utils";
import { tenantFilter } from "../utils/tenant.utils";

// GET all loyalty ledger records
export const getLoyaltyLedgers = async (req: Request, res: Response) => {
    try {
        const type = req.query.type as string | undefined;
        const customerId = req.query.customerId as string | undefined;

        const filter: any = {
        ...tenantFilter(req),
            isActive: true,
        };

        if (type) {
            filter.type = type;
        }

        if (customerId) {
            if (!mongoose.Types.ObjectId.isValid(customerId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid customer ID",
                });
                return;
            }

            filter.customerId = customerId;
        }

        const ledgers = await LoyaltyLedger.find(filter)
            .populate("customerId", "name phone email loyaltyPoints lifetimePointsEarned loyaltyTier")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: ledgers.length,
            data: ledgers,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get loyalty ledger records",
            error: error.message,
        });
    }
};

// GET loyalty ledger by ID
export const getLoyaltyLedgerById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid loyalty ledger ID",
            });
            return;
        }

        const ledger = await LoyaltyLedger.findOne({ ...tenantFilter(req),
            _id: id,
            isActive: true,
        }).populate(
            "customerId",
            "name phone email loyaltyPoints lifetimePointsEarned loyaltyTier"
        );

        if (!ledger) {
            res.status(404).json({
                success: false,
                message: "Loyalty ledger record not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: ledger,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get loyalty ledger record",
            error: error.message,
        });
    }
};

// GET loyalty ledger records for one customer
export const getCustomerLoyaltyLedger = async (
    req: Request,
    res: Response
) => {
    try {
        const customerId = req.params.customerId as string;

        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const customer = await Customer.findOne({ ...tenantFilter(req),
            _id: customerId,
            isActive: true,
        });

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        const ledgers = await LoyaltyLedger.find({ ...tenantFilter(req),
            customerId,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            customer: {
                _id: customer._id,
                name: customer.name,
                loyaltyPoints: customer.loyaltyPoints,
                lifetimePointsEarned: customer.lifetimePointsEarned,
                loyaltyTier: customer.loyaltyTier,
            },
            count: ledgers.length,
            data: ledgers,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get customer loyalty ledger",
            error: error.message,
        });
    }
};

// POST earn points
export const earnPoints = async (req: Request, res: Response) => {
    try {
        const {
            customerId,
            amountSpent = 0,
            points,
            description,
            reference,
        } = req.body;

        if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Valid customer ID is required",
            });
            return;
        }

        const numericPoints = Number(points);
        const numericAmountSpent = Number(amountSpent);

        if (!numericPoints || numericPoints <= 0) {
            res.status(400).json({
                success: false,
                message: "Points must be greater than 0",
            });
            return;
        }

        if (numericAmountSpent < 0) {
            res.status(400).json({
                success: false,
                message: "Amount spent cannot be negative",
            });
            return;
        }

        const customer = await Customer.findOne({ ...tenantFilter(req),
            _id: customerId,
            isActive: true,
        });

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        customer.totalSpent += numericAmountSpent;
        customer.loyaltyPoints += numericPoints;
        customer.lifetimePointsEarned += numericPoints;
        customer.loyaltyTier = calculateLoyaltyTier(
            customer.lifetimePointsEarned
        );

        await customer.save();

        const ledger = await LoyaltyLedger.create({ storeId: req.storeId!, 
            customerId,
            type: "earn",
            points: numericPoints,
            amountSpent: numericAmountSpent,
            balanceAfter: customer.loyaltyPoints,
            tierAfter: customer.loyaltyTier,
            description: description || `Earned ${numericPoints} points`,
            reference,
        });

        const fullLedger = await LoyaltyLedger.findById(ledger._id).populate(
            "customerId",
            "name phone email loyaltyPoints lifetimePointsEarned loyaltyTier"
        );

        res.status(201).json({
            success: true,
            message: "Loyalty points earned successfully",
            data: fullLedger,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to earn loyalty points",
            error: error.message,
        });
    }
};

// POST redeem points
export const redeemPoints = async (req: Request, res: Response) => {
    try {
        const { customerId, points, description, reference } = req.body;

        if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Valid customer ID is required",
            });
            return;
        }

        const numericPoints = Number(points);

        if (!numericPoints || numericPoints <= 0) {
            res.status(400).json({
                success: false,
                message: "Points must be greater than 0",
            });
            return;
        }

        const customer = await Customer.findOne({ ...tenantFilter(req),
            _id: customerId,
            isActive: true,
        });

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        if (customer.loyaltyPoints < numericPoints) {
            res.status(400).json({
                success: false,
                message: "Customer does not have enough loyalty points",
            });
            return;
        }

        customer.loyaltyPoints -= numericPoints;

        // Redeeming points does not reduce lifetime points.
        customer.loyaltyTier = calculateLoyaltyTier(
            customer.lifetimePointsEarned
        );

        await customer.save();

        const ledger = await LoyaltyLedger.create({ storeId: req.storeId!, 
            customerId,
            type: "redeem",
            points: -numericPoints,
            balanceAfter: customer.loyaltyPoints,
            tierAfter: customer.loyaltyTier,
            description: description || `Redeemed ${numericPoints} points`,
            reference,
        });

        const fullLedger = await LoyaltyLedger.findById(ledger._id).populate(
            "customerId",
            "name phone email loyaltyPoints lifetimePointsEarned loyaltyTier"
        );

        res.status(201).json({
            success: true,
            message: "Loyalty points redeemed successfully",
            data: fullLedger,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to redeem loyalty points",
            error: error.message,
        });
    }
};

// POST adjust points
export const adjustPoints = async (req: Request, res: Response) => {
    try {
        const { customerId, points, description, reference } = req.body;

        if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Valid customer ID is required",
            });
            return;
        }

        const numericPoints = Number(points);

        if (!numericPoints || numericPoints === 0) {
            res.status(400).json({
                success: false,
                message: "Points adjustment cannot be 0",
            });
            return;
        }

        const customer = await Customer.findOne({ ...tenantFilter(req),
            _id: customerId,
            isActive: true,
        });

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        const newBalance = customer.loyaltyPoints + numericPoints;

        if (newBalance < 0) {
            res.status(400).json({
                success: false,
                message: "Adjustment cannot make loyalty points negative",
            });
            return;
        }

        customer.loyaltyPoints = newBalance;

        if (numericPoints > 0) {
            customer.lifetimePointsEarned += numericPoints;
        }

        customer.loyaltyTier = calculateLoyaltyTier(
            customer.lifetimePointsEarned
        );

        await customer.save();

        const ledger = await LoyaltyLedger.create({ storeId: req.storeId!, 
            customerId,
            type: "adjust",
            points: numericPoints,
            balanceAfter: customer.loyaltyPoints,
            tierAfter: customer.loyaltyTier,
            description: description || `Adjusted points by ${numericPoints}`,
            reference,
        });

        const fullLedger = await LoyaltyLedger.findById(ledger._id).populate(
            "customerId",
            "name phone email loyaltyPoints lifetimePointsEarned loyaltyTier"
        );

        res.status(201).json({
            success: true,
            message: "Loyalty points adjusted successfully",
            data: fullLedger,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to adjust loyalty points",
            error: error.message,
        });
    }
};

// DELETE loyalty ledger - soft delete
export const deleteLoyaltyLedger = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid loyalty ledger ID",
            });
            return;
        }

        const ledger = await LoyaltyLedger.findOneAndUpdate(
            { ...tenantFilter(req),
                _id: id,
                isActive: true,
            },
            {
                isActive: false,
            },
            {
                new: true,
            }
        );

        if (!ledger) {
            res.status(404).json({
                success: false,
                message: "Loyalty ledger record not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Loyalty ledger record deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete loyalty ledger record",
            error: error.message,
        });
    }
};