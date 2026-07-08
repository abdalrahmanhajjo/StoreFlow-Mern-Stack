import { Request, Response } from "express";
import mongoose from "mongoose";
import Customer from "../models/customer.model";

// GET all customers
export const getCustomers = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string | undefined;

        const filter: any = {
            isActive: true,
        };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const customers = await Customer.find(filter).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            count: customers.length,
            data: customers,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get customers",
            error: error.message,
        });
    }
};

// GET customer by ID
export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const customer = await Customer.findOne({
            _id: id,
            isActive: true,
        });

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: customer,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get customer",
            error: error.message,
        });
    }
};

// CREATE customer
export const createCustomer = async (req: Request, res: Response) => {
    try {
        const customer = await Customer.create(req.body);

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: customer,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create customer",
            error: error.message,
        });
    }
};

// UPDATE customer
export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const customer = await Customer.findOneAndUpdate(
            {
                _id: id,
                isActive: true,
            },
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Customer updated successfully",
            data: customer,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to update customer",
            error: error.message,
        });
    }
};

// DELETE customer - soft delete
export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        const customer = await Customer.findOneAndUpdate(
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

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Customer deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete customer",
            error: error.message,
        });
    }
};

// ADD purchase history to customer
export const addCustomerPurchase = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { productName, amount, note } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid customer ID",
            });
            return;
        }

        if (amount === undefined || Number(amount) < 0) {
            res.status(400).json({
                success: false,
                message: "Amount is required and cannot be negative",
            });
            return;
        }

        const customer = await Customer.findOneAndUpdate(
            {
                _id: id,
                isActive: true,
            },
            {
                $push: {
                    purchaseHistory: {
                        productName,
                        amount: Number(amount),
                        purchaseDate: new Date(),
                        note,
                    },
                },
                $inc: {
                    totalSpent: Number(amount),
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!customer) {
            res.status(404).json({
                success: false,
                message: "Customer not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Purchase added successfully",
            data: customer,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to add purchase",
            error: error.message,
        });
    }
};