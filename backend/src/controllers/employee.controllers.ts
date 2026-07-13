import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { Store } from "../models/store.model";
import { AppError } from "../utils/error.utils";
import { hashPassword, generateRawToken, hashToken, sendEmployeeInviteEmail } from "../utils/auth.utils";

const INVITE_TTL_DAYS = 7;

export const getEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const employees = await User.find({
      storeId: req.user!.storeId,
      role: { $in: ["owner", "manager", "cashier"] },
    });

    res.json({
      success: true,
      data: employees,
    });
  } catch (err) {
    next(err);
  }
};

export const inviteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email, role } = req.body;

  const exists = await User.findOne({ email });
  if (exists)
    return next(new AppError("Email already in use", 409));

  // Random unguessable password + invite token — employee sets their
  // own password via the accept-invite flow (POST /api/auth/accept-invite).
  const placeholderHash = await hashPassword(generateRawToken(32));
  const rawToken = generateRawToken(32);

  const employee = await User.create({
    name,
    email,
    passwordHash: placeholderHash,
    role,
    storeId: req.user!.storeId,
    isActive: false,
    isEmailVerified: false,
    passwordResetTokenHash: hashToken(rawToken),
    passwordResetExpires: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    phone: { countryCode: "", number: "" },
    idVerification: { type: "national_id", number: "" },
  });

  const store = await Store.findById(req.user!.storeId).select('storeName').lean();

  // Send invite email (logged as fallback when email not configured)
  const inviteUrl = `${process.env.CLIENT_APP_URL || "http://localhost:5175"}/accept-invite?token=${rawToken}`;
  sendEmployeeInviteEmail(email, {
    inviteUrl,
    inviterName: req.user!.sub || "Your store manager",
    storeName: store?.storeName || "your store",
    role: role || "staff",
  });

  res.status(201).json({
    success: true,
    message: "Invitation sent. The employee will receive an email to set their password.",
    data: { id: employee._id, name, email, role },
  });
}

export const updateEmployeeRole = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

    const {role}=req.body;

    const employee = await User.findOneAndUpdate(

        {
            _id:req.params.id,
            storeId:req.user!.storeId
        },

        {role},

        {new:true}

    );

    if(!employee)
        return next(new AppError("Employee not found",404));

    res.json({

        success:true,
        data:employee

    });

}

export const toggleEmployeeStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

    const employee = await User.findOne({

        _id:req.params.id,
        storeId:req.user!.storeId

    });

    if(!employee)
        return next(new AppError("Employee not found",404));

    employee.isActive=!employee.isActive;

    await employee.save();

    res.json({

        success:true,
        data:employee

    });

}
export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

    const employee = await User.findOne({

        _id:req.params.id,
        storeId:req.user!.storeId

    });

    if(!employee)
        return next(new AppError("Employee not found",404));

    if(employee.role==="owner")
        return next(new AppError("Owner cannot be deleted",400));

    await employee.deleteOne();

    res.json({

        success:true,
        message:"Employee deleted"

    });

}