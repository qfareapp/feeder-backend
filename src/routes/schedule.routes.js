import express from "express";
import {
  addSchedule,
  getSchedules,
  activateSchedule,
  startTrip,
  endTrip,
} from "../controllers/schedule.controller.js";

const router = express.Router();

// ✅ Test route to check if this file is mounted properly
router.get("/ping", (req, res) => {
  res.json({ msg: "✅ schedule routes alive" });
});

// ✅ Create new schedule
router.post("/", addSchedule);

// ✅ Get schedules (optionally filter by date)
router.get("/", getSchedules);

// ✅ Activate a schedule by ID
router.patch("/:id/activate", activateSchedule);

// ✅ Start trip
router.put("/:id/start", startTrip);

// ✅ End trip (also moves tickets to ride history)
router.put("/:id/end", endTrip);

// Alias for older callers expecting POST /end-trip/:scheduleId
router.post("/end-trip/:scheduleId", (req, res, next) => {
  req.params.id = req.params.scheduleId;
  return endTrip(req, res, next);
});

export default router;
