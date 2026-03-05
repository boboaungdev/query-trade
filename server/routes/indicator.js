import express from "express";
import { createIndicator } from "../controllers/indicator/create.js";

const router = express.Router();

router.post("/create", createIndicator);

export const indicatorRouter = router;
