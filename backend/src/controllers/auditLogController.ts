import { Request, Response } from "express";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog";

// GET all audit logs
export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const action = req.query.action as string | undefined;
        const entity = req.query.entity as string | undefined;
        const performedByName = req.query.performedByName as string | undefined;
        const search = req.query.search as string | undefined;

        const filter: any = {
            isActive: true,
        };

        if (action) {
            filter.action = action;
        }

        if (entity) {
            filter.entity = entity;
        }

        if (performedByName) {
            filter.performedByName = {
                $regex: performedByName,
                $options: "i",
            };
        }

        if (search) {
            filter.$or = [
                { action: { $regex: search, $options: "i" } },
                { entity: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { performedByName: { $regex: search, $options: "i" } },
            ];
        }

        const logs = await AuditLog.find(filter).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get audit logs",
            error: error.message,
        });
    }
};

// GET audit log by ID
export const getAuditLogById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid audit log ID",
            });
            return;
        }

        const log = await AuditLog.findOne({
            _id: id,
            isActive: true,
        });

        if (!log) {
            res.status(404).json({
                success: false,
                message: "Audit log not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: log,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get audit log",
            error: error.message,
        });
    }
};

// GET logs for one entity
export const getAuditLogsByEntity = async (req: Request, res: Response) => {
    try {
        const entity = req.params.entity as string;
        const entityId = req.params.entityId as string;

        if (!mongoose.Types.ObjectId.isValid(entityId)) {
            res.status(400).json({
                success: false,
                message: "Invalid entity ID",
            });
            return;
        }

        const logs = await AuditLog.find({
            entity,
            entityId,
            isActive: true,
        }).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to get entity audit logs",
            error: error.message,
        });
    }
};

// DELETE audit log - soft delete
export const deleteAuditLog = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid audit log ID",
            });
            return;
        }

        const log = await AuditLog.findOneAndUpdate(
            {
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

        if (!log) {
            res.status(404).json({
                success: false,
                message: "Audit log not found",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Audit log deleted successfully",
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: "Failed to delete audit log",
            error: error.message,
        });
    }
};