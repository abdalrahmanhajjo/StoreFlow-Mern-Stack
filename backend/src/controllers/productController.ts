import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/Product";
import Category from "../models/Category";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.categoryId as string | undefined;
    const search = req.query.search as string | undefined;

    const filter: any = {
      isActive: true,
    };

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
        return;
      }

      filter.categoryId = categoryId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    const product = await Product.findOne({
      _id: id,
      isActive: true,
    }).populate("categoryId", "name");

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get product",
      error: error.message,
    });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const categoryId = req.body.categoryId as string;

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
      return;
    }

    const category = await Category.findOne({
      _id: categoryId,
      isActive: true,
    });

    if (!category) {
      res.status(404).json({
        success: false,
        message: "Category not found",
      });
      return;
    }

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    if (req.body.categoryId) {
      const categoryId = req.body.categoryId as string;

      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
        return;
      }

      const category = await Category.findOne({
        _id: categoryId,
        isActive: true,
      });

      if (!category) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("categoryId", "name");

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    const product = await Product.findOneAndUpdate(
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

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: {
        $lte: ["$quantity", "$reorderThreshold"],
      },
    })
      .populate("categoryId", "name")
      .sort({ quantity: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to get low stock products",
      error: error.message,
    });
  }
};

export const updateProductStock = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const quantity = Number(req.body.quantity);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    if (
      req.body.quantity === undefined ||
      Number.isNaN(quantity) ||
      quantity < 0
    ) {
      res.status(400).json({
        success: false,
        message: "Quantity is required and cannot be negative",
      });
      return;
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
      },
      {
        quantity,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("categoryId", "name");

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product stock updated successfully",
      data: product,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update product stock",
      error: error.message,
    });
  }
};