import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISupplier extends Document {
    storeId: Types.ObjectId;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    suppliedProducts: mongoose.Types.ObjectId[];
    notes?: string;
    isActive: boolean;
}

const supplierSchema = new Schema<ISupplier>(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: "Store",
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: [true, "Supplier name is required"],
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
        },

        address: {
            type: String,
            trim: true,
        },

        suppliedProducts: [
            {
                type: Schema.Types.ObjectId,
                ref: "Product",
            },
        ],

        notes: {
            type: String,
            trim: true,
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

const Supplier = mongoose.model<ISupplier>("Supplier", supplierSchema);

export default Supplier;