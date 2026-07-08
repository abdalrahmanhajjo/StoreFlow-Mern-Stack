import express from "express";

import {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/category.controller";

import {
    createCategorySchema,
    updateCategorySchema,
} from "../validators/category.validator";

import { validate } from "../middleware/validate.middleware";

const router = express.Router();

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.post("/", validate(createCategorySchema), createCategory);

router.put("/:id", validate(updateCategorySchema), updateCategory);

router.delete("/:id", deleteCategory);

export default router;