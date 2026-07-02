import { Request, Response } from "express";
import mongoose from "mongoose";
import Sale from "../models/Sale";
import Product from "../models/Product";
import Customer from "../models/Customer";

const generateInvoiceNumber = (): string => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const random = Math.floor(1000 + Math.random() * 9000);

    return `INV-${year}${month}${day}-${Date.now()}-${random}`;
};

// GET all sales
export const getSales = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;

        const filter: any = {
            isActive: true,
        };

        if (status) {
            filter.status = status;
        }

        const sales = await Sale.find(filter)
            .populate("customerId", "name phone email")
            .populate("items.productId", "name sku price quantity")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: sales.length,
            data: sales,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get sales",
            error: error.message,
        });
    }
};

// GET sale by ID
export const getSaleById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid sale ID",
            });
            return;
        }

        const sale = await Sale.findOne({
            _id: id,
            isActive: true,
        })
            .populate("customerId", "name phone email")
            .populate("items.productId", "name sku price quantity");

        if (!sale) {
            res.status(404).json({
                success: false,
                message: "Sale not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: sale,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get sale",
            error: error.message,
        });
    }
};

// GET invoice by invoice number
export const getInvoiceByNumber = async (req: Request, res: Response) => {
    try {
        const invoiceNumber = req.params.invoiceNumber as string;

        const sale = await Sale.findOne({
            invoiceNumber,
            isActive: true,
        })
            .populate("customerId", "name phone email")
            .populate("items.productId", "name sku price quantity");

        if (!sale) {
            res.status(404).json({
                success: false,
                message: "Invoice not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: sale,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get invoice",
            error: error.message,
        });
    }
};

// CREATE sale / invoice
export const createSale = async (req: Request, res: Response) => {
    try {
        const {
            customerId,
            cashierName,
            items,
            discount = 0,
            taxRate = 0,
            paymentMethod,
            paidAmount,
            notes,
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({
                success: false,
                message: "Sale must contain at least one item",
            });
            return;
        }

        if (!paymentMethod) {
            res.status(400).json({
                success: false,
                message: "Payment method is required",
            });
            return;
        }

        if (!["cash", "card", "mobile_payment"].includes(paymentMethod)) {
            res.status(400).json({
                success: false,
                message: "Invalid payment method",
            });
            return;
        }

        if (customerId) {
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
        }

        let subtotal = 0;

        const saleItems = [];

        for (const item of items) {
            const productId = item.productId as string;
            const quantity = Number(item.quantity);

            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID",
                });
                return;
            }

            if (!quantity || quantity <= 0) {
                res.status(400).json({
                    success: false,
                    message: "Quantity must be greater than 0",
                });
                return;
            }

            const product = await Product.findOne({
                _id: productId,
                isActive: true,
            });

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: "Product not found",
                });
                return;
            }

            if (product.quantity < quantity) {
                res.status(400).json({
                    success: false,
                    message: `Not enough stock for ${product.name}. Available: ${product.quantity}`,
                });
                return;
            }

            const unitPrice = product.price;
            const itemSubtotal = unitPrice * quantity;

            subtotal += itemSubtotal;

            saleItems.push({
                productId: product._id,
                productName: product.name,
                sku: product.sku,
                quantity,
                unitPrice,
                subtotal: itemSubtotal,
            });
        }

        const numericDiscount = Number(discount);
        const numericTaxRate = Number(taxRate);

        if (numericDiscount < 0) {
            res.status(400).json({
                success: false,
                message: "Discount cannot be negative",
            });
            return;
        }

        if (numericDiscount > subtotal) {
            res.status(400).json({
                success: false,
                message: "Discount cannot be greater than subtotal",
            });
            return;
        }

        if (numericTaxRate < 0) {
            res.status(400).json({
                success: false,
                message: "Tax rate cannot be negative",
            });
            return;
        }

        const afterDiscount = subtotal - numericDiscount;
        const taxAmount = afterDiscount * (numericTaxRate / 100);
        const total = afterDiscount + taxAmount;

        const finalPaidAmount =
            paidAmount === undefined ? total : Number(paidAmount);

        if (finalPaidAmount < total) {
            res.status(400).json({
                success: false,
                message: "Paid amount cannot be less than total",
            });
            return;
        }

        const changeAmount = finalPaidAmount - total;

        const invoiceNumber = generateInvoiceNumber();

        const sale = await Sale.create({
            invoiceNumber,
            customerId,
            cashierName,
            items: saleItems,
            subtotal,
            discount: numericDiscount,
            taxRate: numericTaxRate,
            taxAmount,
            total,
            paymentMethod,
            paidAmount: finalPaidAmount,
            changeAmount,
            status: "completed",
            notes,
        });

        for (const item of saleItems) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: {
                    quantity: -item.quantity,
                },
            });
        }

        if (customerId) {
            await Customer.findByIdAndUpdate(customerId, {
                $inc: {
                    totalSpent: total,
                },
                $push: {
                    purchaseHistory: {
                        productName: `Invoice ${invoiceNumber}`,
                        amount: total,
                        purchaseDate: new Date(),
                        note: "Sale invoice",
                    },
                },
            });
        }

        const fullSale = await Sale.findById(sale._id)
            .populate("customerId", "name phone email")
            .populate("items.productId", "name sku price quantity");

        res.status(201).json({
            success: true,
            message: "Sale invoice created successfully",
            data: fullSale,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create sale invoice",
            error: error.message,
        });
    }
};

// VOID sale and restore stock
export const voidSale = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid sale ID",
            });
            return;
        }

        const sale = await Sale.findOne({
            _id: id,
            isActive: true,
        });

        if (!sale) {
            res.status(404).json({
                success: false,
                message: "Sale not found",
            });
            return;
        }

        if (sale.status !== "completed") {
            res.status(400).json({
                success: false,
                message: "Only completed sales can be voided",
            });
            return;
        }

        for (const item of sale.items) {
            await Product.findByIdAndUpdate(item.productId, {
                $inc: {
                    quantity: item.quantity,
                },
            });
        }

        sale.status = "voided";
        await sale.save();

        if (sale.customerId) {
            await Customer.findByIdAndUpdate(sale.customerId, {
                $inc: {
                    totalSpent: -sale.total,
                },
                $push: {
                    purchaseHistory: {
                        productName: `Voided Invoice ${sale.invoiceNumber}`,
                        amount: 0,
                        purchaseDate: new Date(),
                        note: `Sale voided. Original total was ${sale.total}`,
                    },
                },
            });
        }

        res.status(200).json({
            success: true,
            message: "Sale voided successfully and stock restored",
            data: sale,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to void sale",
            error: error.message,
        });
    }
};