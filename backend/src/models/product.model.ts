import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
    storeId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  price: number;
  cost: number;
  quantity: number;
  reorderThreshold: number;
  imageUrl?: string;
  categoryId: mongoose.Types.ObjectId;
  isActive: boolean;
}

const productSchema = new Schema<IProduct>(
  {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: [true, "storeId is required"],
            index: true,
        },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
    },

    barcode: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    cost: {
      type: Number,
      required: [true, "Cost is required"],
      min: [0, "Cost cannot be negative"],
    },

    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },

    reorderThreshold: {
      type: Number,
      default: 5,
      min: [0, "Reorder threshold cannot be negative"],
    },

    imageUrl: {
      type: String,
    },

    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// SKU is unique within a store, not across the platform.
productSchema.index({ storeId: 1, sku: 1 }, { unique: true });

const Product = mongoose.model<IProduct>("Product", productSchema);

export default Product;