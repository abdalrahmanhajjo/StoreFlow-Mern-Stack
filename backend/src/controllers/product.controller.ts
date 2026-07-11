import { Request, Response } from "express";
import mongoose from "mongoose";
import Product from "../models/product.model";
import Category from "../models/category.model";
import { tenantFilter } from "../utils/tenant.utils";

// GET all products with filters and pagination
export const getProducts = async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string | undefined;
    const barcode = req.query.barcode as string | undefined;
    const categoryId =
      (req.query.categoryId as string | undefined) ||
      (req.query.category as string | undefined);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { ...tenantFilter(req) };

    // Status filter
    // status=active → active products
    // status=inactive → deleted/inactive products
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

    // Name filter
    if (name) {
      filter.name = {
        $regex: name,
        $options: "i",
      };
    }

    // Barcode filter
    if (barcode) {
      filter.barcode = {
        $regex: barcode,
        $options: "i",
      };
    }

    // Category filter
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

    // General search filter: name, sku, barcode
    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          sku: {
            $regex: search,
            $options: "i",
          },
        },
        {
          barcode: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (page <= 0 || limit <= 0) {
      res.status(400).json({
        success: false,
        message: "Page and limit must be greater than 0",
      });
      return;
    }

    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate("categoryId", "name description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      success: true,
      count: products.length,
      totalProducts,
      pagination: {
        currentPage: page,
        totalPages,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      filters: {
        name: name || null,
        barcode: barcode || null,
        categoryId: categoryId || null,
        status: status || "active",
        search: search || null,
      },
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

// GET product by ID
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

    const product = await Product.findOne({ ...tenantFilter(req),
      _id: id,
      isActive: true,
    }).populate("categoryId", "name description");

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

// CREATE product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      sku,
      barcode,
      description,
      price,
      cost,
      quantity = 0,
      reorderThreshold = 5,
      imageUrl,
      categoryId,
    } = req.body;

    if (!name || !sku || price === undefined || cost === undefined || !categoryId) {
      res.status(400).json({
        success: false,
        message: "Name, SKU, price, cost, and categoryId are required",
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
      return;
    }

    const category = await Category.findOne({ ...tenantFilter(req),
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

    const product = await Product.create({ storeId: req.storeId!, 
      name,
      sku,
      barcode,
      description,
      price,
      cost,
      quantity,
      reorderThreshold,
      imageUrl,
      categoryId,
    });

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

// UPDATE product
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
      if (!mongoose.Types.ObjectId.isValid(req.body.categoryId)) {
        res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
        return;
      }

      const category = await Category.findOne({ ...tenantFilter(req),
        _id: req.body.categoryId,
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
            { ...tenantFilter(req),
        _id: id,
        isActive: true,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("categoryId", "name description");

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

// DELETE product - soft delete
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

// GET low stock products
export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ ...tenantFilter(req),
      isActive: true,
      $expr: {
        $lte: ["$quantity", "$reorderThreshold"],
      },
    })
      .populate("categoryId", "name description")
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

// PATCH update product stock
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

    if (quantity < 0 || Number.isNaN(quantity)) {
      res.status(400).json({
        success: false,
        message: "Quantity must be 0 or greater",
      });
      return;
    }

    const product = await Product.findOneAndUpdate(
            { ...tenantFilter(req),
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
    ).populate("categoryId", "name description");

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