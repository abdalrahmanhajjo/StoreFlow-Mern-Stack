import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
    storeId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  emoji?: string;
  imageUrl?: string;
  isActive: boolean;
}

const categorySchema = new Schema<ICategory>(
  {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: [true, "storeId is required"],
            index: true,
        },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name cannot exceed 50 characters"],

      validate: {
        validator: function (value: string) {
          return /^[A-Za-z0-9\s&-]+$/.test(value);
        },
        message:
          "Category name can only contain letters, numbers, spaces, &, and -",
      },
    },

    description: {
      type: String,
      trim: true,
      maxlength: [250, "Description cannot exceed 250 characters"],
    },

    emoji: {
      type: String,
      trim: true,
      maxlength: [8, "Emoji is too long"],
    },

    imageUrl: {
      type: String,
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

// Prevent duplicate category names with different letter cases
categorySchema.index(
  { storeId: 1, name: 1 },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

const Category = mongoose.model<ICategory>("Category", categorySchema);

export default Category;