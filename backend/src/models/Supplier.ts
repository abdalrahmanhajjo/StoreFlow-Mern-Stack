import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
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