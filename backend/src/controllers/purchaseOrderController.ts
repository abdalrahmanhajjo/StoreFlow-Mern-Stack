import { Request, Response } from "express";
import mongoose from "mongoose";
import PurchaseOrder from "../models/PurchaseOrder";
import Supplier from "../models/Supplier";
import Product from "../models/Product";

const generateOrderNumber = (): string => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const random = Math.floor(1000 + Math.random() * 9000);

    return `PO-${year}${month}${day}-${Date.now()}-${random}`;
};

// GET all purchase orders
export const getPurchaseOrders = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;

        const filter: any = {
            isActive: true,
        };

        if (status) {
            filter.status = status;
        }

        const purchaseOrders = await PurchaseOrder.find(filter)
            .populate("supplierId", "name phone email")
            .populate("items.productId", "name sku quantity cost price")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: purchaseOrders.length,
            data: purchaseOrders,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get purchase orders",
            error: error.message,
        });
    }
};

// GET purchase order by ID
export const getPurchaseOrderById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid purchase order ID",
            });
            return;
        }

        const purchaseOrder = await PurchaseOrder.findOne({
            _id: id,
            isActive: true,
        })
            .populate("supplierId", "name phone email")
            .populate("items.productId", "name sku quantity cost price");

        if (!purchaseOrder) {
            res.status(404).json({
                success: false,
                message: "Purchase order not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: purchaseOrder,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get purchase order",
            error: error.message,
        });
    }
};

// GET purchase orders by supplier
export const getPurchaseOrdersBySupplier = async (
    req: Request,
    res: Response
) => {
    try {
        const supplierId = req.params.supplierId as string;

        if (!mongoose.Types.ObjectId.isValid(supplierId)) {
            res.status(400).json({
                success: false,
                message: "Invalid supplier ID",
            });
            return;
        }

        const supplier = await Supplier.findOne({
            _id: supplierId,
            isActive: true,
        });

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        const purchaseOrders = await PurchaseOrder.find({
            supplierId,
            isActive: true,
        })
            .populate("items.productId", "name sku quantity cost price")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            supplier: {
                _id: supplier._id,
                name: supplier.name,
                phone: supplier.phone,
                email: supplier.email,
            },
            count: purchaseOrders.length,
            data: purchaseOrders,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get supplier purchase orders",
            error: error.message,
        });
    }
};

// CREATE purchase order
export const createPurchaseOrder = async (req: Request, res: Response) => {
    try {
        const { supplierId, items, createdByName, notes } = req.body;

        if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
            res.status(400).json({
                success: false,
                message: "Invalid supplier ID",
            });
            return;
        }

        const supplier = await Supplier.findOne({
            _id: supplierId,
            isActive: true,
        });

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({
                success: false,
                message: "Purchase order must contain at least one item",
            });
            return;
        }

        let totalCost = 0;
        const purchaseOrderItems = [];

        for (const item of items) {
            const productId = item.productId as string;
            const quantityOrdered = Number(item.quantityOrdered);
            const unitCost = Number(item.unitCost);

            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID",
                });
                return;
            }

            if (
                Number.isNaN(quantityOrdered) ||
                quantityOrdered <= 0
            ) {
                res.status(400).json({
                    success: false,
                    message: "Quantity ordered must be greater than 0",
                });
                return;
            }

            if (Number.isNaN(unitCost) || unitCost < 0) {
                res.status(400).json({
                    success: false,
                    message: "Unit cost cannot be negative",
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

            const subtotal = quantityOrdered * unitCost;
            totalCost += subtotal;

            purchaseOrderItems.push({
                productId: product._id,
                productName: product.name,
                sku: product.sku,
                quantityOrdered,
                quantityReceived: 0,
                unitCost,
                subtotal,
            });
        }

        const orderNumber = generateOrderNumber();

        const purchaseOrder = await PurchaseOrder.create({
            supplierId,
            supplierName: supplier.name,
            orderNumber,
            items: purchaseOrderItems,
            status: "pending",
            totalCost,
            orderDate: new Date(),
            createdByName,
            notes,
        });

        const fullPurchaseOrder = await PurchaseOrder.findById(purchaseOrder._id)
            .populate("supplierId", "name phone email")
            .populate("items.productId", "name sku quantity cost price");

        res.status(201).json({
            success: true,
            message: "Purchase order created successfully",
            data: fullPurchaseOrder,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create purchase order",
            error: error.message,
        });
    }
};

// UPDATE purchase order basic info
export const updatePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid purchase order ID",
            });
            return;
        }

        const purchaseOrder = await PurchaseOrder.findOne({
            _id: id,
            isActive: true,
        });

        if (!purchaseOrder) {
            res.status(404).json({
                success: false,
                message: "Purchase order not found",
            });
            return;
        }

        if (
            purchaseOrder.status === "received" ||
            purchaseOrder.status === "cancelled"
        ) {
            res.status(400).json({
                success: false,
                message: "Cannot update received or cancelled purchase order",
            });
            return;
        }

        const allowedUpdates: any = {};

        if (req.body.notes !== undefined) {
            allowedUpdates.notes = req.body.notes;
        }

        if (req.body.createdByName !== undefined) {
            allowedUpdates.createdByName = req.body.createdByName;
        }

        if (req.body.status !== undefined) {
            if (!["pending", "ordered"].includes(req.body.status)) {
                res.status(400).json({
                    success: false,
                    message: "Status can only be updated to pending or ordered here",
                });
                return;
            }

            allowedUpdates.status = req.body.status;
        }

        const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
            id,
            allowedUpdates,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate("supplierId", "name phone email")
            .populate("items.productId", "name sku quantity cost price");

        res.status(200).json({
            success: true,
            message: "Purchase order updated successfully",
            data: updatedPurchaseOrder,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to update purchase order",
            error: error.message,
        });
    }
};

// RECEIVE purchase order items
export const receivePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { receivedItems } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid purchase order ID",
            });
            return;
        }

        if (
            !receivedItems ||
            !Array.isArray(receivedItems) ||
            receivedItems.length === 0
        ) {
            res.status(400).json({
                success: false,
                message: "receivedItems must contain at least one item",
            });
            return;
        }

        const purchaseOrder = await PurchaseOrder.findOne({
            _id: id,
            isActive: true,
        });

        if (!purchaseOrder) {
            res.status(404).json({
                success: false,
                message: "Purchase order not found",
            });
            return;
        }

        if (purchaseOrder.status === "cancelled") {
            res.status(400).json({
                success: false,
                message: "Cannot receive a cancelled purchase order",
            });
            return;
        }

        if (purchaseOrder.status === "received") {
            res.status(400).json({
                success: false,
                message: "Purchase order is already fully received",
            });
            return;
        }

        for (const receivedItem of receivedItems) {
            const productId = receivedItem.productId as string;
            const quantityReceivedNow = Number(receivedItem.quantityReceived);

            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID in received items",
                });
                return;
            }

            if (
                Number.isNaN(quantityReceivedNow) ||
                quantityReceivedNow <= 0
            ) {
                res.status(400).json({
                    success: false,
                    message: "Quantity received must be greater than 0",
                });
                return;
            }

            const orderItem = purchaseOrder.items.find(
                (item) => item.productId.toString() === productId
            );

            if (!orderItem) {
                res.status(400).json({
                    success: false,
                    message: "Product does not exist in this purchase order",
                });
                return;
            }

            const remainingQuantity =
                orderItem.quantityOrdered - orderItem.quantityReceived;

            if (quantityReceivedNow > remainingQuantity) {
                res.status(400).json({
                    success: false,
                    message: `Cannot receive ${quantityReceivedNow}. Remaining quantity for ${orderItem.productName} is ${remainingQuantity}`,
                });
                return;
            }

            orderItem.quantityReceived += quantityReceivedNow;

            await Product.findByIdAndUpdate(productId, {
                $inc: {
                    quantity: quantityReceivedNow,
                },
            });
        }

        const allItemsReceived = purchaseOrder.items.every(
            (item) => item.quantityReceived === item.quantityOrdered
        );

        const someItemsReceived = purchaseOrder.items.some(
            (item) => item.quantityReceived > 0
        );

        if (allItemsReceived) {
            purchaseOrder.status = "received";
            purchaseOrder.receivedDate = new Date();
        } else if (someItemsReceived) {
            purchaseOrder.status = "partially_received";
        }

        await purchaseOrder.save();

        const fullPurchaseOrder = await PurchaseOrder.findById(purchaseOrder._id)
            .populate("supplierId", "name phone email")
            .populate("items.productId", "name sku quantity cost price");

        res.status(200).json({
            success: true,
            message: "Purchase order received successfully and stock updated",
            data: fullPurchaseOrder,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to receive purchase order",
            error: error.message,
        });
    }
};

// CANCEL purchase order
export const cancelPurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid purchase order ID",
            });
            return;
        }

        const purchaseOrder = await PurchaseOrder.findOne({
            _id: id,
            isActive: true,
        });

        if (!purchaseOrder) {
            res.status(404).json({
                success: false,
                message: "Purchase order not found",
            });
            return;
        }

        if (
            purchaseOrder.status === "received" ||
            purchaseOrder.status === "partially_received"
        ) {
            res.status(400).json({
                success: false,
                message: "Cannot cancel a received or partially received purchase order",
            });
            return;
        }

        purchaseOrder.status = "cancelled";
        await purchaseOrder.save();

        res.status(200).json({
            success: true,
            message: "Purchase order cancelled successfully",
            data: purchaseOrder,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to cancel purchase order",
            error: error.message,
        });
    }
};

// DELETE purchase order - soft delete
export const deletePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid purchase order ID",
            });
            return;
        }

        const purchaseOrder = await PurchaseOrder.findOneAndUpdate(
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

        if (!purchaseOrder) {
            res.status(404).json({
                success: false,
                message: "Purchase order not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Purchase order deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete purchase order",
            error: error.message,
        });
    }
};