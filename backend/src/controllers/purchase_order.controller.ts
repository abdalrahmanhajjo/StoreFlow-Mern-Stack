import { Request, Response } from "express";
import mongoose from "mongoose";
import PurchaseOrder from "../models/purchase_order.model";
import Supplier from "../models/supplier.model";
import Product from "../models/product.model";
import AuditLog from "../models/audit_log.model";
import { tenantFilter } from "../utils/tenant.utils";

const generateOrderNumber = (): string => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const random = Math.floor(1000 + Math.random() * 9000);

    return `PO-${year}${month}${day}-${Date.now()}-${random}`;
};


class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
    }
}



// GET all purchase orders
export const getPurchaseOrders = async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string | undefined;

        const filter: any = {
        ...tenantFilter(req),
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

        const purchaseOrder = await PurchaseOrder.findOne({ ...tenantFilter(req),
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

        const supplier = await Supplier.findOne({ ...tenantFilter(req),
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

        const purchaseOrders = await PurchaseOrder.find({ ...tenantFilter(req),
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

        const supplier = await Supplier.findOne({ ...tenantFilter(req),
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

            const product = await Product.findOne({ ...tenantFilter(req),
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

        const purchaseOrder = await PurchaseOrder.create({ storeId: req.storeId!, 
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

        const purchaseOrder = await PurchaseOrder.findOne({ ...tenantFilter(req),
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

export const receivePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        const {
            receivedItems,
            receivedByName = "Bakr",
            notes,
        } = req.body;

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

        const purchaseOrder = await PurchaseOrder.findOne({ ...tenantFilter(req),
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
                message: "Cancelled purchase orders cannot be received",
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

        const stockUpdates: any[] = [];

        for (const receivedItem of receivedItems) {
            const productId = receivedItem.productId as string;
            const quantityReceivedNow = Number(receivedItem.quantityReceived);

            if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid product ID in receivedItems",
                });
                return;
            }

            if (
                !quantityReceivedNow ||
                Number.isNaN(quantityReceivedNow) ||
                quantityReceivedNow <= 0
            ) {
                res.status(400).json({
                    success: false,
                    message: "quantityReceived must be greater than 0",
                });
                return;
            }

            const orderItem: any = purchaseOrder.items.find(
                (item: any) => item.productId.toString() === productId
            );

            if (!orderItem) {
                res.status(400).json({
                    success: false,
                    message: "Received product is not part of this purchase order",
                });
                return;
            }

            const remainingQuantity =
                orderItem.quantityOrdered - orderItem.quantityReceived;

            if (quantityReceivedNow > remainingQuantity) {
                res.status(400).json({
                    success: false,
                    message: `Cannot receive more than remaining quantity for ${orderItem.productName}. Remaining: ${remainingQuantity}`,
                });
                return;
            }

            const productBeforeUpdate = await Product.findOne({ ...tenantFilter(req),
                _id: productId,
                isActive: true,
            });

            if (!productBeforeUpdate) {
                res.status(404).json({
                    success: false,
                    message: "Product not found",
                });
                return;
            }

            const previousQuantity = productBeforeUpdate.quantity;

            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                {
                    $inc: {
                        quantity: quantityReceivedNow,
                    },
                },
                {
                    new: true,
                    runValidators: true,
                }
            );

            if (!updatedProduct) {
                res.status(400).json({
                    success: false,
                    message: "Failed to increase product stock",
                });
                return;
            }

            orderItem.quantityReceived += quantityReceivedNow;

            stockUpdates.push({
                productId,
                productName: orderItem.productName,
                sku: orderItem.sku,
                quantityReceivedNow,
                previousQuantity,
                newQuantity: updatedProduct.quantity,
            });

            await AuditLog.create({ storeId: req.storeId!, 
                action: "PO_STOCK_INCREASE",
                entity: "Product",
                entityId: updatedProduct._id,
                description: `Stock increased by ${quantityReceivedNow} for product ${orderItem.productName} from purchase order ${purchaseOrder.orderNumber}`,
                performedByName: receivedByName,
                metadata: {
                    purchaseOrderId: purchaseOrder._id,
                    orderNumber: purchaseOrder.orderNumber,
                    productId,
                    productName: orderItem.productName,
                    sku: orderItem.sku,
                    quantityReceivedNow,
                    previousQuantity,
                    newQuantity: updatedProduct.quantity,
                },
            });
        }

        const allItemsFullyReceived = purchaseOrder.items.every(
            (item: any) => item.quantityReceived >= item.quantityOrdered
        );

        const atLeastOneItemReceived = purchaseOrder.items.some(
            (item: any) => item.quantityReceived > 0
        );

        if (allItemsFullyReceived) {
            purchaseOrder.status = "received";
            purchaseOrder.receivedDate = new Date();
        } else if (atLeastOneItemReceived) {
            purchaseOrder.status = "partially_received";
        }

        if (notes) {
            purchaseOrder.notes = notes;
        }

        await purchaseOrder.save();

        await AuditLog.create({ storeId: req.storeId!, 
            action: "RECEIVE_PURCHASE_ORDER",
            entity: "PurchaseOrder",
            entityId: purchaseOrder._id,
            description: `Purchase order ${purchaseOrder.orderNumber} received with status ${purchaseOrder.status}`,
            performedByName: receivedByName,
            metadata: {
                purchaseOrderId: purchaseOrder._id,
                orderNumber: purchaseOrder.orderNumber,
                supplierId: purchaseOrder.supplierId,
                supplierName: purchaseOrder.supplierName,
                status: purchaseOrder.status,
                receivedItems,
                stockUpdates,
            },
        });

        const fullPurchaseOrder = await PurchaseOrder.findById(purchaseOrder._id)
            .populate("supplierId", "name phone email address")
            .populate("items.productId", "name sku price quantity");

        res.status(200).json({
            success: true,
            message: "Purchase order received successfully",
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

        const purchaseOrder = await PurchaseOrder.findOne({ ...tenantFilter(req),
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