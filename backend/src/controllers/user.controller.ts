import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { AppError } from "../utils/error.utils";
import { hashPassword } from "../utils/auth.utils";

// 1. CREATE USER
export const createUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { password, ...userData } = req.body;
        
        if (!password) {
            return next(new AppError("Password is required to create a user account.", 400));
        }
        
        // 1. Hash the incoming password string using your utility function
        const passwordHash = await hashPassword(password);
        
        // 2. Write the new user into MongoDB
        const user = await User.create({ ...userData, passwordHash });

        // 3. Return response (passwordHash is automatically excluded by the model)
        res.status(201).json({
            success: true,
            message: "User account created successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// 2. GET ALL USERS
export const getUsers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const users = await User.find();
        
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        next(error);
    }
};

// 3. GET USER BY ID
export const getUserById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid User ID format", 400));
        }

        const user = await User.findById(id);
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// 4. UPDATE USER
export const updateUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid User ID format", 400));
        }

        const updateData = { ...req.body };
        
        // Guardrail: Never let passwords or hash strings leak into a general profile update endpoint
        delete updateData.passwordHash; 
        delete updateData.password; 

        const user = await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "User profile updated successfully",
            data: user
        });
    } catch (error) {
        next(error);
    }
};

// 5. DELETE USER
export const deleteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError("Invalid User ID format", 400));
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return next(new AppError("User not found", 404));
        }

        res.status(200).json({
            success: true,
            message: "User account deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};