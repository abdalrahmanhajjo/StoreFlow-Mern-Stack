import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    role: string;
    passwordHash: string;
    storeId: string;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        role: { type: String, required: true },
        passwordHash: { type: String, required: true },
        storeId: { type: String, required: true }
    },
    { timestamps: true }
);

export default model<IUser>("User", userSchema);
