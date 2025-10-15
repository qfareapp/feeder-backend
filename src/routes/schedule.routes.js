import express from "express";
import {
  addSchedule,
  getSchedules,
  activateSchedule,
} from "../controllers/schedule.controller.js";
import BusSchedule from "../models/busSchedule.model.js";

const router = express.Router();

// ✅ Test route to check if this file is mounted properly
router.get("/ping", (req, res) => {
  res.json({ msg: "✅ schedule routes alive" });
});

// ➡️ Create new schedule
router.post("/", addSchedule);

// ➡️ Get schedules (optionally filter by date)
router.get("/", getSchedules);

// ➡️ Activate a schedule by ID
router.patch("/:id/activate", activateSchedule);

// ➡️ Start trip
router.put("/:id/start", async (req, res) => {
  try {
    const schedule = await BusSchedule.findByIdAndUpdate(
      req.params.id,
      { status: "Trip Started", startTime: new Date() },
      { new: true }
    );
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➡️ End trip
router.put("/:id/end", async (req, res) => {
  try {
    const schedule = await BusSchedule.findByIdAndUpdate(
      req.params.id,
      { status: "Trip Completed", endTime: new Date() },
      { new: true }
    );
    if (!schedule) {
      return res.status(404).json({ error: "Schedule not found" });
    }
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
