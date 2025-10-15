// routes/boarding.routes.js
import express from "express";
import { confirmBoarding, getBoardingStatus } from "../controllers/boarding.controller.js";

const router = express.Router();

/**
 * @route POST /api/boarding/confirm
 * @desc Passenger scans QR → confirms boarding + seat assignment
 */
router.post("/confirm", confirmBoarding);

/**
 * @route GET /api/boarding/status/:bookingId
 * @desc Optional — Check if user has boarded & seat assigned
 */
router.get("/status/:bookingId", getBoardingStatus);

export default router;
