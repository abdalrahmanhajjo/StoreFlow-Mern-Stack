import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { randomBytes } from "crypto";
import { User } from "../models/user.model";
import { Store } from "../models/store.model";
import { AppError } from "../utils/error.utils";
import {
    hashPassword,
    generateRawToken,
    hashToken,
    sendEmployeeInviteEmail,
} from "../utils/auth.utils";
import { tenantFilter } from "../utils/tenant.utils";

const INVITE_TTL_DAYS = 7;

// INVITE STAFF — creates an inactive account and emails a set-password link.
// The invitee finishes via POST /api/auth/accept-invite. No password is set
// here, so an unaccepted invite can never be signed into.
export const inviteUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { name, email, role } = req.body;
        const inviter = req.user!;

        const targetRole = role ?? "cashier";
        if (inviter.role !== "platform_admin" && !["manager", "cashier"].includes(targetRole)) {
            return next(new AppError("Owners can only invite manager or cashier accounts", 403));
        }

        const storeId = inviter.role === "platform_admin" ? req.body.storeId : req.storeId;
        if (!storeId) {
            return next(new AppError("A store is required to invite staff", 400));
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return next(new AppError("An account with this email already exists", 409));
        }

        // Unusable random password — the account is unlocked only by accepting.
        const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
        const rawToken = generateRawToken(32);

        const user = await User.create({
            name,
            email,
            passwordHash,
            role: targetRole,
            storeId,
            isActive: false,
            isEmailVerified: false,
            passwordResetTokenHash: hashToken(rawToken),
            passwordResetExpires: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
        });

        const store = await Store.findById(storeId);
        const inviteUrl = `${process.env.CLIENT_APP_URL}/accept-invite?token=${rawToken}`;

        // The sender never throws; it returns whether the email was actually
        // accepted so the owner gets truthful feedback instead of a blind
        // "sent". The invite URL is handed back too, so if email failed the
        // owner (who created this invite) can copy the link and share it.
        //
        // `name` here is the INVITEE's own name — the seeded employee-invite
        // template greets "Hello {{name}}," addressing the person being
        // invited, not whoever sent the invite.
        const emailSent = await sendEmployeeInviteEmail(email, {
            inviteUrl,
            name,
            storeName: store?.storeName ?? "your store",
            role: targetRole,
        });

        res.status(201).json({
            success: true,
            message: emailSent
                ? "Invite sent"
                : "Invite created, but the email could not be sent — share the link manually.",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                storeId: user.storeId,
                isActive: user.isActive,
                emailSent,
                inviteUrl,
            },
        });
    } catch (error) {
        next(error);
    }
};

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

        // Owners create staff for their own store only, never elevated roles.
        if (req.user!.role !== "platform_admin") {
            userData.storeId = req.storeId;
            if (!["manager", "cashier"].includes(userData.role)) {
                return next(new AppError("Owners can only create manager or cashier accounts", 403));
            }
        }
        
        // 1. Hash the incoming password string using your utility function
        const passwordHash = await hashPassword(password);

        // 2. Write the new user into MongoDB. A staff account provisioned
        //    directly by a trusted owner/admin (with a password set here) is
        //    immediately usable — otherwise it would default to unverified and
        //    could never sign in, since there is no verification path for
        //    admin-created accounts. `isActive` stays true so they can log in.
        const user = await User.create({
            ...userData,
            passwordHash,
            isEmailVerified: userData.isEmailVerified ?? true,
        });

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
        const users = await User.find({ ...tenantFilter(req) });
        
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

        const user = await User.findOne({ _id: id, ...tenantFilter(req) });
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

        // Owners can't move users between stores or mint elevated roles.
        if (req.user!.role !== "platform_admin") {
            delete updateData.storeId;
            if (updateData.role && !["manager", "cashier"].includes(updateData.role)) {
                return next(new AppError("Owners can only assign manager or cashier roles", 403));
            }
        }

        const user = await User.findOneAndUpdate(
            { _id: id, ...tenantFilter(req) },
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

        const user = await User.findOneAndDelete({ _id: id, ...tenantFilter(req) });
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