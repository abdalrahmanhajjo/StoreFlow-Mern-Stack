import { Request, Response } from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer";
import LoyaltyLedger from "../models/LoyaltyLedger";

// GET all loyalty ledger records
export const getLoyaltyLedgers = async (req: Request, res: Response) => {
    try {
        const ledgers = await LoyaltyLedger.find({ isActive: true })
            .populate("customerId", "name phone email loyaltyPoints")
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

// GET one loyalty ledger record by ID
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

        const ledger = await LoyaltyLedger.findOne({
            _id: id,
            isActive: true,
        }).populate("customerId", "name phone email loyaltyPoints");

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

// GET loyalty history for one customer
export const getCustomerLoyaltyLedger = async (req: Request, res: Response) => {
    try {
        const customerId = req.params.customerId as string;

        if (!mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const customer = await Customer.findOne({
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

        const ledgers = await LoyaltyLedger.find({
            customerId,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                loyaltyPoints: customer.loyaltyPoints,
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

// EARN points
export const earnPoints = async (req: Request, res: Response) => {
    try {
        const { customerId, amountSpent, points, description, reference } = req.body;

        if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const earnedPoints = Number(points);
        const spentAmount = Number(amountSpent || 0);

        if (Number.isNaN(earnedPoints) || earnedPoints <= 0) {
            res.status(400).json({
                success: false,
                message: "Points must be greater than 0",
            });
            return;
        }

        const customer = await Customer.findOne({
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

        customer.loyaltyPoints += earnedPoints;
        customer.totalSpent += spentAmount;

        await customer.save();

        const ledger = await LoyaltyLedger.create({
            customerId,
            type: "earn",
            points: earnedPoints,
            amountSpent: spentAmount,
            balanceAfter: customer.loyaltyPoints,
            description: description || "Points earned from purchase",
            reference,
        });

        res.status(201).json({
            success: true,
            message: "Loyalty points earned successfully",
            data: {
                customer,
                ledger,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to earn loyalty points",
            error: error.message,
        });
    }
};

// REDEEM points
export const redeemPoints = async (req: Request, res: Response) => {
    try {
        const { customerId, points, description, reference } = req.body;

        if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const redeemedPoints = Number(points);

        if (Number.isNaN(redeemedPoints) || redeemedPoints <= 0) {
            res.status(400).json({
                success: false,
                message: "Points must be greater than 0",
            });
            return;
        }

        const customer = await Customer.findOne({
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

        if (customer.loyaltyPoints < redeemedPoints) {
            res.status(400).json({
                success: false,
                message: "Customer does not have enough loyalty points",
            });
            return;
        }

        customer.loyaltyPoints -= redeemedPoints;

        await customer.save();

        const ledger = await LoyaltyLedger.create({
            customerId,
            type: "redeem",
            points: -redeemedPoints,
            balanceAfter: customer.loyaltyPoints,
            description: description || "Points redeemed",
            reference,
        });

        res.status(201).json({
            success: true,
            message: "Loyalty points redeemed successfully",
            data: {
                customer,
                ledger,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to redeem loyalty points",
            error: error.message,
        });
    }
};

// ADJUST points manually
export const adjustPoints = async (req: Request, res: Response) => {
    try {
        const { customerId, points, description, reference } = req.body;

        if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const adjustedPoints = Number(points);

        if (Number.isNaN(adjustedPoints) || adjustedPoints === 0) {
            res.status(400).json({
                success: false,
                message: "Points must not be 0",
            });
            return;
        }

        const customer = await Customer.findOne({
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

        const newBalance = customer.loyaltyPoints + adjustedPoints;

        if (newBalance < 0) {
            res.status(400).json({
                success: false,
                message: "Adjustment would make points negative",
            });
            return;
        }

        customer.loyaltyPoints = newBalance;

        await customer.save();

        const ledger = await LoyaltyLedger.create({
            customerId,
            type: "adjust",
            points: adjustedPoints,
            balanceAfter: customer.loyaltyPoints,
            description: description || "Manual points adjustment",
            reference,
        });

        res.status(201).json({
            success: true,
            message: "Loyalty points adjusted successfully",
            data: {
                customer,
                ledger,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to adjust loyalty points",
            error: error.message,
        });
    }
};

// DELETE loyalty ledger record - soft delete
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
            {
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