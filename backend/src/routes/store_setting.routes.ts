import express from "express";

import {
    getStoreSetting,
    createStoreSetting,
    updateStoreSetting,
    resetStoreSetting,
} from "../controllers/store_setting.controller";

import { validate } from "../middleware/validate.middleware";

import {
    createStoreSettingSchema,
    updateStoreSettingSchema,
} from "../validators/storeSetting.validator";

const router = express.Router();

router.get("/", getStoreSetting);

router.post(
    "/",
    validate(createStoreSettingSchema),
    createStoreSetting
);

router.put(
    "/",
    validate(updateStoreSettingSchema),
    updateStoreSetting
);

router.patch(
    "/reset",
    resetStoreSetting
);

export default router;