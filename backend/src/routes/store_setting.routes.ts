import express from "express";

import {
    getStoreSetting,
    createStoreSetting,
    updateStoreSetting,
    resetStoreSetting,
} from "../controllers/store_setting.controller";

const router = express.Router();

router.get("/", getStoreSetting);

router.post("/", createStoreSetting);

router.put("/", updateStoreSetting);

router.patch("/reset", resetStoreSetting);

export default router;