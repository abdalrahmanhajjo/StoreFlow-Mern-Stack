import { Request, Response } from "express";
import mongoose from "mongoose";
import Supplier from "../models/supplier.model";
import Product from "../models/product.model";

// Helper function to build multi-tenant query objects dynamically
const buildTenantFilter = (req: Request, baseFilter: any = {}) => {
    const filter = { ...baseFilter };
    if (req.storeId) {
        filter.storeId = req.storeId;
    }
    return filter;
};

// Validate product IDs if suppliedProducts is sent
const validateSuppliedProducts = async (
    suppliedProducts: string[] | undefined,
    storeId: any
): Promise<boolean> => {
    if (!suppliedProducts || suppliedProducts.length === 0) {
        return true;
    }

    const allValid = suppliedProducts.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!allValid) {
        return false;
    }

    // Build the query object conditionally depending on whether tenant scope is active
    const productQuery = buildTenantFilter({ storeId } as any, {
        _id: { $in: suppliedProducts },
        isActive: true,
    });

    const count = await Product.countDocuments(productQuery);
    return count === suppliedProducts.length;
};

// GET all suppliers
export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string | undefined;

        // Build base filter with tenant isolation rules applied automatically
        const filter = buildTenantFilter(req, { isActive: true });

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const suppliers = await Supplier.find(filter)
            .populate("suppliedProducts", "name sku price quantity")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: suppliers.length,
            data: suppliers,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get suppliers",
            error: error.message,
        });
    }
};

// GET supplier by ID
export const getSupplierById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid supplier ID",
            });
            return;
        }

        const query = buildTenantFilter(req, { _id: id, isActive: true });
        const supplier = await Supplier.findOne(query).populate("suppliedProducts", "name sku price quantity");

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: supplier,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get supplier",
            error: error.message,
        });
    }
};

// CREATE supplier
export const createSupplier = async (req: Request, res: Response) => {
    try {
        const { suppliedProducts } = req.body;

        const validProducts = await validateSuppliedProducts(suppliedProducts, req.storeId);

        if (!validProducts) {
            res.status(400).json({
                success: false,
                message: "One or more supplied product IDs are invalid",
            });
            return;
        }

        // Explicitly set storeId to prevent standard users from modifying other data environments
        const supplier = await Supplier.create({
            ...req.body,
            storeId: req.storeId,
        });

        const fullSupplier = await Supplier.findById(supplier._id).populate(
            "suppliedProducts",
            "name sku price quantity"
        );

        res.status(201).json({
            success: true,
            message: "Supplier created successfully",
            data: fullSupplier,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create supplier",
            error: error.message,
        });
    }
};

// UPDATE supplier
export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid supplier ID",
            });
            return;
        }

        if (req.body.suppliedProducts) {
            const validProducts = await validateSuppliedProducts(
                req.body.suppliedProducts,
                req.storeId
            );

            if (!validProducts) {
                res.status(400).json({
                    success: false,
                    message: "One or more supplied product IDs are invalid",
                });
                return;
            }
        }

        const query = buildTenantFilter(req, { _id: id, isActive: true });
        const supplier = await Supplier.findOneAndUpdate(
            query,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        ).populate("suppliedProducts", "name sku price quantity");

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Supplier updated successfully",
            data: supplier,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to update supplier",
            error: error.message,
        });
    }
};

// DELETE supplier - soft delete
export const deleteSupplier = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid supplier ID",
            });
            return;
        }

        const query = buildTenantFilter(req, { _id: id, isActive: true });
        const supplier = await Supplier.findOneAndUpdate(
            query,
            { isActive: false },
            { new: true }
        );

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Supplier deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete supplier",
            error: error.message,
        });
    }
};

// ADD one product to supplier
export const addProductToSupplier = async (req: Request, res: Response) => {
    try {
        const supplierId = req.params.id as string;
        const { productId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(supplierId)) {
            res.status(400).json({
                success: false,
                message: "Invalid supplier ID",
            });
            return;
        }

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
            return;
        }

        const productQuery = buildTenantFilter(req, { _id: productId, isActive: true });
        const product = await Product.findOne(productQuery);

        if (!product) {
            res.status(404).json({
                success: false,
                message: "Product not found",
            });
            return;
        }

        const supplierQuery = buildTenantFilter(req, { _id: supplierId, isActive: true });
        const supplier = await Supplier.findOneAndUpdate(
            supplierQuery,
            { $addToSet: { suppliedProducts: productId } },
            { new: true }
        ).populate("suppliedProducts", "name sku price quantity");

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Product added to supplier successfully",
            data: supplier,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to add product to supplier",
            error: error.message,
        });
    }
};

// REMOVE one product from supplier
export const removeProductFromSupplier = async (
    req: Request,
    res: Response
) => {
    try {
        const supplierId = req.params.id as string;
        const productId = req.params.productId as string;

        if (!mongoose.Types.ObjectId.isValid(supplierId)) {
            res.status(400).json({
                success: false,
                message: "Invalid supplier ID",
            });
            return;
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            res.status(400).json({
                success: false,
                message: "Invalid product ID",
            });
            return;
        }

        const query = buildTenantFilter(req, { _id: supplierId, isActive: true });
        const supplier = await Supplier.findOneAndUpdate(
            query,
            { $pull: { suppliedProducts: productId } },
            { new: true }
        ).populate("suppliedProducts", "name sku price quantity");

        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Product removed from supplier successfully",
            data: supplier,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to remove product from supplier",
            error: error.message,
        });
    }
};