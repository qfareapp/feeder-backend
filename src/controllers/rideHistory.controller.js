import RideHistory from "../models/rideHistory.model.js";
import { createRideHistoryForSchedule } from "../services/rideHistory.service.js";

/* 🔹 internal – called from schedule end */
export const generateFromSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const result = await createRideHistoryForSchedule(scheduleId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("RideHistory schedule error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/* 🔹 mobile app – get user’s ride history */
export const getUserRideHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const rides = await RideHistory.find({ user: userId })
      .sort({ date: -1, createdAt: -1 })
      .populate("scheduleId", "startTime endTime slot tripType")
      .lean();

    res.json({ success: true, rides });
  } catch (err) {
    console.error("Get ride history error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
