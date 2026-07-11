import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../models/category.model";
import Product from "../models/product.model";
import { tenantFilter } from "../utils/tenant.utils";

// GET all categories with product count
export const getCategories = async (req: Request, res: Response) => {
    try {
        const search = req.query.search as string | undefined;
        const status = req.query.status as string | undefined;

        const filter: any = { ...tenantFilter(req) };

        // status=active → active categories
        // status=inactive → inactive categories
        // status=all → active + inactive
        if (!status || status === "active") {
            filter.isActive = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        } else if (status === "all") {
            // no isActive filter
        } else {
            res.status(400).json({
                success: false,
                message: "Invalid status. Use active, inactive, or all.",
            });
            return;
        }

        if (search) {
            filter.$or = [
                {
                    name: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    description: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const categories = await Category.find(filter).sort({
            createdAt: -1,
        });

        const categoriesWithProductCount = await Promise.all(
            categories.map(async (category) => {
                const productCount = await Product.countDocuments({ ...tenantFilter(req),
                    categoryId: category._id,
                    isActive: true,
                });

                return {
                    ...category.toObject(),
                    productCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            count: categoriesWithProductCount.length,
            data: categoriesWithProductCount,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get categories",
            error: error.message,
        });
    }
};

// GET category by ID with product count
export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID",
            });
            return;
        }

        const category = await Category.findOne({ ...tenantFilter(req),
            _id: id,
            isActive: true,
        });

        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }

        const productCount = await Product.countDocuments({ ...tenantFilter(req),
            categoryId: category._id,
            isActive: true,
        });

        res.status(200).json({
            success: true,
            data: {
                ...category.toObject(),
                productCount,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get category",
            error: error.message,
        });
    }
};

// CREATE category
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            res.status(400).json({
                success: false,
                message: "Category name is required",
            });
            return;
        }

        const category = await Category.create({ storeId: req.storeId!, 
            name,
            description,
        });

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: {
                ...category.toObject(),
                productCount: 0,
            },
        });
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: "Category name already exists",
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Failed to create category",
            error: error.message,
        });
    }
};

// UPDATE category
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID",
            });
            return;
        }

        const category = await Category.findOneAndUpdate(
            { ...tenantFilter(req),
                _id: id,
                isActive: true,
            },
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }

        const productCount = await Product.countDocuments({ ...tenantFilter(req),
            categoryId: category._id,
            isActive: true,
        });

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: {
                ...category.toObject(),
                productCount,
            },
        });
    } catch (error: any) {
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: "Category name already exists",
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: "Failed to update category",
            error: error.message,
        });
    }
};

// DELETE category - soft delete with product guard
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid category ID",
            });
            return;
        }

        const category = await Category.findOne({ ...tenantFilter(req),
            _id: id,
            isActive: true,
        });

        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }

        const assignedProductsCount = await Product.countDocuments({ ...tenantFilter(req),
            categoryId: id,
            isActive: true,
        });

        if (assignedProductsCount > 0) {
            res.status(400).json({
                success: false,
                message: `Cannot delete category because ${assignedProductsCount} active product(s) are assigned to it.`,
                productCount: assignedProductsCount,
            });
            return;
        }

        category.isActive = false;
        await category.save();

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
            data: category,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete category",
            error: error.message,
        });
    }
};