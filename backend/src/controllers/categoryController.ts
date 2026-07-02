import { Request, Response } from "express";
import mongoose from "mongoose";
import Category from "../models/Category";
import Product from "../models/Product";

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find({ isActive: true }).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get categories",
            error: error.message,
        });
    }
};

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

        const category = await Category.findOne({
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

        res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get category",
            error: error.message,
        });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const category = await Category.create(req.body);

        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to create category",
            error: error.message,
        });
    }
};

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

        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to update category",
            error: error.message,
        });
    }
};

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

        const productsUsingCategory = await Product.countDocuments({
            categoryId: id,
            isActive: true,
        });

        if (productsUsingCategory > 0) {
            res.status(400).json({
                success: false,
                message: "Cannot delete category because it has products",
            });
            return;
        }

        const category = await Category.findOneAndUpdate(
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

        if (!category) {
            res.status(404).json({
                success: false,
                message: "Category not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete category",
            error: error.message,
        });
    }
};