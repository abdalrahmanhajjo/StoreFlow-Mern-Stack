import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { User } from "../models/user.model";
import { AppError } from "../utils/error.utils";
import { hashPassword } from "../utils/auth.utils";

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
  const {name,email,role}=req.body;

    const exists = await User.findOne({email});

    if(exists)
        return next(new AppError("Email already in use",409));

    const passwordHash = await hashPassword("Temp123!");

    const employee = await User.create({

        name,
        email,
        passwordHash,
        role,
        storeId:req.user!.storeId,
        isActive:true,

        phone:{
            countryCode:"",
            number:"",
        },

        idVerification:{
            type:"national_id",
            number:"",
        }

    });

    res.status(201).json({

        success:true,
        message:"Employee invited",
        data:employee

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