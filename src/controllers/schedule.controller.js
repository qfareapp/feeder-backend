import BusSchedule from "../models/busSchedule.model.js";
import Bus from "../models/bus.model.js";
import { DateTime } from "luxon";

/* ============================================================
   ✅ Add or Update Daily Schedule (Assign Bus)
   ============================================================ */
export const addSchedule = async (req, res) => {
  try {
    const { date, routeId, slot, tripType, busId, societyId } = req.body;

    if (!date || !routeId || !slot || !busId || !tripType) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    if (!["pickup", "drop"].includes(tripType)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid tripType" });
    }

    // ✅ Normalize date (remove time)
    // normalize to local midnight (not UTC)
const travelDate = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
  .startOf("day")
  .toJSDate();

    // ✅ Fetch bus to auto-fill capacity
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    // ✅ Check if this schedule already exists
    let schedule = await BusSchedule.findOne({
      routeId,
      date: travelDate,
      slot,
      tripType,
    });

    if (schedule) {
      // Update existing assignment
      schedule.busId = busId;
      schedule.societyId = societyId;
      schedule.totalSeats = bus.seatingCapacity;
      schedule.status = "Scheduled";
      await schedule.save();
      return res.json({
        success: true,
        message: "Schedule updated successfully",
        schedule,
      });
    }

    // ✅ Create new schedule
    schedule = await BusSchedule.create({
      date: travelDate,
      routeId,
      slot,
      tripType,
      busId,
      societyId,
      totalSeats: bus.seatingCapacity,
      booked: 0,
      status: "Scheduled",
    });

    res.status(201).json({ success: true, message: "Schedule created", schedule });
  } catch (err) {
    console.error("❌ addSchedule error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================
   ✅ Activate Schedule
   ============================================================ */
export const activateSchedule = async (req, res) => {
  try {
    const schedule = await BusSchedule.findByIdAndUpdate(
      req.params.id,
      { status: "Active" },
      { new: true }
    );
    if (!schedule)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, schedule });
  } catch (err) {
    console.error("❌ activateSchedule error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================
   ✅ Get Schedules (Filter by Date + Route)
   ============================================================ */
export const getSchedules = async (req, res) => {
  try {
    const { date, routeId } = req.query;
    const query = {};

    // ✅ Filter by normalized date
    if (date) {
  const istStart = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
    .startOf("day")
    .toJSDate();
  const istEnd = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
    .endOf("day")
    .toJSDate();

  query.date = { $gte: istStart, $lt: istEnd };

  console.log("🕐 IST Filter Range:", istStart, "→", istEnd);
}

    // ✅ Filter by routeId if provided
    if (routeId) query.routeId = routeId;

    const schedules = await BusSchedule.find(query)
      .populate("busId", "regNumber seatingCapacity driverName")
      .populate("routeId", "routeNo startPoint endPoint")
      .populate("societyId", "name")
      .sort({ slot: 1 });

    const enriched = schedules.map((s) => ({
      ...s.toObject(),
      totalSeats: s.busId?.seatingCapacity || s.totalSeats || 0,
      available: Math.max(
        0,
        (s.busId?.seatingCapacity || s.totalSeats || 0) - (s.booked || 0)
      ),
    }));

    res.json({ success: true, schedules: enriched });
  } catch (err) {
    console.error("❌ getSchedules error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ============================================================
   ✅ Start Trip / End Trip
   ============================================================ */
export const startTrip = async (req, res) => {
  try {
    const schedule = await BusSchedule.findByIdAndUpdate(
      req.params.id,
      { status: "Trip Started", startTime: new Date() },
      { new: true }
    );
    if (!schedule)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const endTrip = async (req, res) => {
  try {
    const schedule = await BusSchedule.findByIdAndUpdate(
      req.params.id,
      { status: "Trip Completed", endTime: new Date() },
      { new: true }
    );
    if (!schedule)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
