import express from "express";
import {
  generateFromSchedule,
  getUserRideHistory,
} from "../controllers/rideHistory.controller.js";

const router = express.Router();

// Called internally by schedule end (or protected by auth)
router.post("/from-schedule/:scheduleId", generateFromSchedule);

// Mobile app – Rides screen can hit this instead of only AsyncStorage
router.get("/user/:userId", getUserRideHistory);

export default router;
