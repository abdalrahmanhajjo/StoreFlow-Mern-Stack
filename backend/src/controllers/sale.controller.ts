import { Request, Response } from "express";
import mongoose from "mongoose";
import Sale from "../models/sale.model";
import Product from "../models/product.model";
import Customer from "../models/customer.model";
import LoyaltyLedger from "../models/loyalty_ledger.model";
import AuditLog from "../models/audit_log.model";
import { calculateLoyaltyTier } from "../utils/loyalty_tier.utils";
import StoreSetting from "../models/store_setting.model";
import { tenantFilter } from "../utils/tenant.utils";
class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}

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
        ...tenantFilter(req),
            isActive: true,
        };

        if (status) {
            filter.status = status;
        }

        const sales = await Sale.find(filter)
            .populate("customerId", "name phone email loyaltyPoints totalSpent lifetimePointsEarned loyaltyTier")
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

        const sale = await Sale.findOne({ ...tenantFilter(req),
            _id: id,
            isActive: true,
        })
            .populate("customerId", "name phone email loyaltyPoints totalSpent lifetimePointsEarned loyaltyTier")
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

        const sale = await Sale.findOne({ ...tenantFilter(req),
            invoiceNumber,
            isActive: true,
        })
            .populate("customerId", "name phone email loyaltyPoints totalSpent lifetimePointsEarned loyaltyTier")
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

// CREATE sale / invoice WITH TRANSACTION ROLLBACK
export const createSale = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

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

        const performedByName = cashierName || "Cashier";

        if (!items || !Array.isArray(items) || items.length === 0) {
            throw new AppError("Sale must contain at least one item", 400);
        }

        if (!paymentMethod) {
            throw new AppError("Payment method is required", 400);
        }

        if (!["cash", "card", "mobile_payment"].includes(paymentMethod)) {
            throw new AppError("Invalid payment method", 400);
        }

        if (customerId) {
            if (!mongoose.Types.ObjectId.isValid(customerId)) {
                throw new AppError("Invalid customer ID", 400);
            }

            const customer = await Customer.findOne({ ...tenantFilter(req),
                _id: customerId,
                isActive: true,
            }).session(session);

            if (!customer) {
                throw new AppError("Customer not found", 404);
            }
        }

        let subtotal = 0;
        const saleItems: any[] = [];

        for (const item of items) {
            const productId = item.productId as string;
            const quantity = Number(item.quantity);

            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                throw new AppError("Invalid product ID", 400);
            }

            if (!quantity || quantity <= 0) {
                throw new AppError("Quantity must be greater than 0", 400);
            }

            const product = await Product.findOne({ ...tenantFilter(req),
                _id: productId,
                isActive: true,
            }).session(session);

            if (!product) {
                throw new AppError("Product not found", 404);
            }

            if (product.quantity < quantity) {
                throw new AppError(
                    `Not enough stock for ${product.name}. Available: ${product.quantity}`,
                    400
                );
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

        if (Number.isNaN(numericDiscount) || numericDiscount < 0) {
            throw new AppError("Discount cannot be negative", 400);
        }

        if (numericDiscount > subtotal) {
            throw new AppError("Discount cannot be greater than subtotal", 400);
        }

        // Tax comes from THIS store's own settings — never trusted from the
        // client — so a tampered request can't under- or over-charge tax.
        // The client value is only a fallback if settings don't exist yet.
        const storeSetting = await StoreSetting.findOne({ ...tenantFilter(req), isActive: true });
        const numericTaxRate = storeSetting
            ? Number(storeSetting.taxRate)
            : Number(taxRate);

        if (Number.isNaN(numericTaxRate) || numericTaxRate < 0) {
            throw new AppError("Tax rate cannot be negative", 400);
        }

        const afterDiscount = subtotal - numericDiscount;
        const taxAmount = afterDiscount * (numericTaxRate / 100);
        const total = afterDiscount + taxAmount;

        const finalPaidAmount =
            paidAmount === undefined ? total : Number(paidAmount);

        if (Number.isNaN(finalPaidAmount) || finalPaidAmount < total) {
            throw new AppError("Paid amount cannot be less than total", 400);
        }

        const changeAmount = finalPaidAmount - total;
        const invoiceNumber = generateInvoiceNumber();

        let loyaltyPointsEarned = 0;

        if (customerId) {
            loyaltyPointsEarned = Math.floor(total);
        }

        const createdSales = await Sale.create([{ storeId: req.storeId!, 
                    invoiceNumber,
                    customerId,
                    cashierName: performedByName,
                    items: saleItems,
                    subtotal,
                    discount: numericDiscount,
                    taxRate: numericTaxRate,
                    taxAmount,
                    total,
                    paymentMethod,
                    paidAmount: finalPaidAmount,
                    changeAmount,
                    loyaltyPointsEarned,
                    status: "completed",
                    notes,
                },
            ],
            { session }
        );

        const sale = createdSales[0];

        await AuditLog.create([{ storeId: req.storeId!, 
                    action: "CREATE_SALE",
                    entity: "Sale",
                    entityId: sale._id,
                    description: `Sale invoice ${invoiceNumber} created with total ${total}`,
                    performedByName,
                    metadata: {
                        invoiceNumber,
                        subtotal,
                        discount: numericDiscount,
                        taxRate: numericTaxRate,
                        taxAmount,
                        total,
                        paymentMethod,
                        paidAmount: finalPaidAmount,
                        changeAmount,
                        customerId,
                        loyaltyPointsEarned,
                    },
                },
            ],
            { session }
        );

        for (const item of saleItems) {
            const updatedProduct = await Product.findOneAndUpdate(
            { ...tenantFilter(req),
                    _id: item.productId,
                    isActive: true,
                    quantity: {
                        $gte: item.quantity,
                    },
                },
                {
                    $inc: {
                        quantity: -item.quantity,
                    },
                },
                {
                    new: true,
                    session,
                }
            );

            if (!updatedProduct) {
                throw new AppError(
                    `Stock update failed for ${item.productName}. The product may not have enough stock.`,
                    400
                );
            }

            await AuditLog.create([{ storeId: req.storeId!, 
                        action: "STOCK_DECREMENT",
                        entity: "Product",
                        entityId: item.productId,
                        description: `Stock decreased by ${item.quantity} for product ${item.productName} because of invoice ${invoiceNumber}`,
                        performedByName,
                        metadata: {
                            saleId: sale._id,
                            invoiceNumber,
                            productId: item.productId,
                            productName: item.productName,
                            sku: item.sku,
                            quantitySold: item.quantity,
                            unitPrice: item.unitPrice,
                            itemSubtotal: item.subtotal,
                            newQuantity: updatedProduct.quantity,
                        },
                    },
                ],
                { session }
            );
        }

        if (customerId) {
            const updatedCustomer = await Customer.findById(customerId).session(
                session
            );

            if (!updatedCustomer) {
                throw new AppError("Customer update failed", 400);
            }

            updatedCustomer.totalSpent += total;
            updatedCustomer.loyaltyPoints += loyaltyPointsEarned;
            updatedCustomer.lifetimePointsEarned += loyaltyPointsEarned;
            updatedCustomer.loyaltyTier = calculateLoyaltyTier(
                updatedCustomer.lifetimePointsEarned
            );

            updatedCustomer.purchaseHistory.push({
                productName: `Invoice ${invoiceNumber}`,
                amount: total,
                purchaseDate: new Date(),
                note: `Sale invoice - earned ${loyaltyPointsEarned} loyalty points. Tier: ${updatedCustomer.loyaltyTier}`,
            });

            await updatedCustomer.save({ session });

            if (loyaltyPointsEarned > 0) {
                await LoyaltyLedger.create([{ storeId: req.storeId!, 
                            customerId,
                            type: "earn",
                            points: loyaltyPointsEarned,
                            amountSpent: total,
                            balanceAfter: updatedCustomer.loyaltyPoints,
                            tierAfter: updatedCustomer.loyaltyTier,
                            description: `Earned ${loyaltyPointsEarned} points from invoice ${invoiceNumber}`,
                            reference: invoiceNumber,
                        },
                    ],
                    { session }
                );

                await AuditLog.create([{ storeId: req.storeId!, 
                            action: "LOYALTY_EARNED",
                            entity: "Customer",
                            entityId: updatedCustomer._id,
                            description: `Customer earned ${loyaltyPointsEarned} loyalty points from invoice ${invoiceNumber} and is now ${updatedCustomer.loyaltyTier}`,
                            performedByName,
                            metadata: {
                                saleId: sale._id,
                                invoiceNumber,
                                customerId,
                                loyaltyPointsEarned,
                                total,
                                balanceAfter: updatedCustomer.loyaltyPoints,
                                lifetimePointsEarned: updatedCustomer.lifetimePointsEarned,
                                loyaltyTier: updatedCustomer.loyaltyTier,
                            },
                        },
                    ],
                    { session }
                );
            }
        }

        await session.commitTransaction();
        session.endSession();

        const fullSale = await Sale.findById(sale._id)
            .populate(
                "customerId",
                "name phone email loyaltyPoints totalSpent lifetimePointsEarned loyaltyTier"
            )
            .populate("items.productId", "name sku price quantity");

        res.status(201).json({
            success: true,
            message: "Sale invoice created successfully",
            data: fullSale,
        });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create sale invoice",
        });
    }
};

// VOID sale and restore stock WITH TRANSACTION ROLLBACK
export const voidSale = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new AppError("Invalid sale ID", 400);
        }

        const sale = await Sale.findOne({ ...tenantFilter(req),
            _id: id,
            isActive: true,
        }).session(session);

        if (!sale) {
            throw new AppError("Sale not found", 404);
        }

        if (sale.status !== "completed") {
            throw new AppError("Only completed sales can be voided", 400);
        }

        const performedByName = sale.cashierName || "Cashier";

        for (const item of sale.items) {
            const updatedProduct = await Product.findByIdAndUpdate(
                item.productId,
                {
                    $inc: {
                        quantity: item.quantity,
                    },
                },
                {
                    new: true,
                    session,
                }
            );

            if (!updatedProduct) {
                throw new AppError(
                    `Failed to restore stock for product ${item.productName}`,
                    400
                );
            }

            await AuditLog.create([{ storeId: req.storeId!, 
                        action: "STOCK_RESTORE",
                        entity: "Product",
                        entityId: item.productId,
                        description: `Stock restored by ${item.quantity} for product ${item.productName} because invoice ${sale.invoiceNumber} was voided`,
                        performedByName,
                        metadata: {
                            saleId: sale._id,
                            invoiceNumber: sale.invoiceNumber,
                            productId: item.productId,
                            productName: item.productName,
                            sku: item.sku,
                            quantityRestored: item.quantity,
                            newQuantity: updatedProduct.quantity,
                        },
                    },
                ],
                { session }
            );
        }

        sale.status = "voided";
        await sale.save({ session });

        await AuditLog.create([{ storeId: req.storeId!, 
                    action: "VOID_SALE",
                    entity: "Sale",
                    entityId: sale._id,
                    description: `Sale invoice ${sale.invoiceNumber} was voided`,
                    performedByName,
                    metadata: {
                        invoiceNumber: sale.invoiceNumber,
                        total: sale.total,
                        loyaltyPointsEarned: sale.loyaltyPointsEarned || 0,
                    },
                },
            ],
            { session }
        );

        if (sale.customerId) {
            const customer = await Customer.findById(sale.customerId).session(
                session
            );

            if (customer) {
                customer.totalSpent = Math.max(0, customer.totalSpent - sale.total);

                const pointsToRemove = Math.min(
                    sale.loyaltyPointsEarned || 0,
                    customer.loyaltyPoints
                );

                customer.loyaltyPoints -= pointsToRemove;

                // Because this void cancels the original sale, we also reverse lifetime earned points.
                customer.lifetimePointsEarned = Math.max(
                    0,
                    customer.lifetimePointsEarned - pointsToRemove
                );

                customer.loyaltyTier = calculateLoyaltyTier(
                    customer.lifetimePointsEarned
                );

                customer.purchaseHistory.push({
                    productName: `Voided Invoice ${sale.invoiceNumber}`,
                    amount: 0,
                    purchaseDate: new Date(),
                    note: `Sale voided. Original total was ${sale.total}. Reversed ${pointsToRemove} loyalty points. Tier: ${customer.loyaltyTier}`,
                });

                await customer.save({ session });

                if (pointsToRemove > 0) {
                    await LoyaltyLedger.create([{ storeId: req.storeId!, 
                                customerId: sale.customerId,
                                type: "adjust",
                                points: -pointsToRemove,
                                balanceAfter: customer.loyaltyPoints,
                                tierAfter: customer.loyaltyTier,
                                description: `Reversed ${pointsToRemove} points from voided invoice ${sale.invoiceNumber}`,
                                reference: sale.invoiceNumber,
                            },
                        ],
                        { session }
                    );

                    await AuditLog.create([{ storeId: req.storeId!, 
                                action: "LOYALTY_REVERSED",
                                entity: "Customer",
                                entityId: customer._id,
                                description: `Reversed ${pointsToRemove} loyalty points from voided invoice ${sale.invoiceNumber}. Customer tier is now ${customer.loyaltyTier}`,
                                performedByName,
                                metadata: {
                                    saleId: sale._id,
                                    invoiceNumber: sale.invoiceNumber,
                                    customerId: sale.customerId,
                                    pointsReversed: pointsToRemove,
                                    balanceAfter: customer.loyaltyPoints,
                                    lifetimePointsEarned: customer.lifetimePointsEarned,
                                    loyaltyTier: customer.loyaltyTier,
                                },
                            },
                        ],
                        { session }
                    );
                }
            }
        }

        await session.commitTransaction();
        session.endSession();

        const fullSale = await Sale.findById(sale._id)
            .populate(
                "customerId",
                "name phone email loyaltyPoints totalSpent lifetimePointsEarned loyaltyTier"
            )
            .populate("items.productId", "name sku price quantity");

        res.status(200).json({
            success: true,
            message: "Sale voided successfully and stock restored",
            data: fullSale,
        });
    } catch (error: any) {
        await session.abortTransaction();
        session.endSession();

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to void sale",
        });
    }
};

export const getSaleReceipt = async (req: Request, res: Response) => {
    try {
        const saleId = req.params.id as string;

        if (!saleId || !mongoose.Types.ObjectId.isValid(saleId)) {
            res.status(400).json({
                success: false,
                message: "Invalid sale ID",
            });
            return;
        }

        const sale: any = await Sale.findOne({ ...tenantFilter(req),
            _id: saleId,
            isActive: true,
        })
            .populate("customerId", "name phone email")
            .populate("items.productId", "name sku price");

        if (!sale) {
            res.status(404).json({
                success: false,
                message: "Sale not found",
            });
            return;
        }

        const storeSettings: any = await StoreSetting.findOne({ ...tenantFilter(req),
            isActive: true,
        });

        const receiptData = {
            store: {
                name:
                    storeSettings?.storeName ||
                    storeSettings?.name ||
                    "StoreFlow POS",
                phone: storeSettings?.phone || storeSettings?.storePhone || "",
                email: storeSettings?.email || storeSettings?.storeEmail || "",
                address: storeSettings?.address || storeSettings?.storeAddress || "",
                currency: storeSettings?.currency || "USD",
                receiptFooter:
                    storeSettings?.receiptFooter ||
                    storeSettings?.receiptFooterMessage ||
                    "Thank you for shopping with us!",
            },

            receipt: {
                saleId: sale._id,
                invoiceNumber: sale.invoiceNumber,
                date: sale.createdAt,
                cashierName: sale.cashierName || sale.createdByName || "Bakr",

                customer: sale.customerId
                    ? {
                        id: sale.customerId._id,
                        name: sale.customerId.name,
                        phone: sale.customerId.phone,
                        email: sale.customerId.email,
                    }
                    : null,

                items: sale.items.map((item: any) => ({
                    productId: item.productId?._id || item.productId,
                    productName: item.productName || item.productId?.name,
                    sku: item.sku || item.productId?.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.subtotal,
                })),

                subtotal: sale.subtotal,
                discount: sale.discount,
                taxRate: sale.taxRate,
                taxAmount: sale.taxAmount,
                total: sale.total,

                payment: {
                    method: sale.paymentMethod,
                    paidAmount: sale.paidAmount,
                    changeAmount: sale.changeAmount,
                },

                loyalty: {
                    pointsEarned: sale.loyaltyPointsEarned || 0,
                    pointsRedeemed: sale.loyaltyPointsRedeemed || 0,
                },

                status: sale.status,
                notes: sale.notes || "",
            },
        };

        res.status(200).json({
            success: true,
            message: "Receipt data retrieved successfully",
            data: receiptData,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get receipt data",
            error: error.message,
        });
    }
};