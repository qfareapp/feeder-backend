import BusSchedule from "../models/busSchedule.model.js";
import DailyBooking from "../models/dailyBooking.model.js";
import Bus from "../models/bus.model.js";
import RideHistory from "../models/rideHistory.model.js";
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
    const { date, routeId, busId } = req.query;
    const query = {};

    // 🔥 Filter by busId (Driver Dashboard)
    if (busId) {
      query.busId = busId;
    }

    // 📅 Filter by normalized IST date
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

    // 📌 Optional route filter
    if (routeId) query.routeId = routeId;

    // Fetch schedules
    const schedules = await BusSchedule.find(query)
      .populate("busId", "regNumber seatingCapacity driverName")
      .populate("routeId", "routeNo startPoint endPoint")
      .populate("societyId", "name")
      .sort({ slot: 1 });

    // 🧮 Add computed fields
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

/* ============================================================
   ⭐ END TRIP + AUTO GENERATE RIDE HISTORY
   ============================================================ */
export const endTrip = async (req, res) => {
  try {
    const { id } = req.params;

    // 1️⃣ Fetch schedule
    const schedule = await BusSchedule.findById(id).populate("routeId");
    if (!schedule) {
      return res.status(404).json({ success: false, error: "Schedule not found" });
    }

    const { tripType, slot, date, busId } = schedule;
    const bus = await Bus.findById(busId);

    // 2️⃣ Mark schedule complete
    schedule.status = "Trip Completed";
    schedule.endTime = new Date();
    await schedule.save();

    // Normalize date
    const tripDate = DateTime.fromJSDate(date)
      .setZone("Asia/Kolkata")
      .startOf("day")
      .toJSDate();

    // 3️⃣ Find affected bookings
    // Match bookings by scheduleId when present, otherwise by slot/date (and busId if stored)
    const common = {
      date: tripDate,
      status: { $in: ["reserved", "boarded"] },
      completed: { $ne: true },
    };

    const slotFilter =
      tripType === "pickup"
        ? {
            $or: [
              { scheduleId: schedule._id },
              { pickupSlot: slot },
              { pickupBusId: busId },
            ],
          }
        : {
            $or: [
              { scheduleId: schedule._id },
              { dropSlot: slot },
              { dropBusId: busId },
            ],
          };

    const filter = { ...common, ...slotFilter };

    const bookings = await DailyBooking.find(filter);
    const updated = [];
    const historyCreated = [];

    // 4️⃣ Update each booking correctly
    for (const b of bookings) {
      const updateData = {};

      if (tripType === "pickup") {
        updateData.pickupBoarded = false;
        updateData.pickupCompleted = true;
      }

      if (tripType === "drop") {
        updateData.dropBoarded = false;
        updateData.dropCompleted = true;
      }

      // 5️⃣ Completion rules
      const pickupCompleted = b.pickupSlot ? b.pickupCompleted || updateData.pickupCompleted : true;
      const dropCompleted = b.dropSlot ? b.dropCompleted || updateData.dropCompleted : true;

      // One-way bookings should close immediately after their only leg ends
      const oneWayCompleted =
        (tripType === "pickup" && !b.dropSlot) || (tripType === "drop" && !b.pickupSlot);

      if (pickupCompleted && dropCompleted || oneWayCompleted) {
        updateData.completed = true;
        updateData.status = "completed"; // <-- proper status
      }

      const updatedBooking = await DailyBooking.findByIdAndUpdate(
        b._id,
        { $set: { ...updateData, scheduleId: schedule._id } },
        { new: true }
      );

      updated.push(updatedBooking);

      // Create ride history entry once the segment ends
      const seatNo =
        tripType === "pickup" ? updatedBooking.pickupSeatNo : updatedBooking.dropSeatNo;

      const existingHistory = await RideHistory.findOne({
        bookingId: b._id,
        tripType,
      });

      if (!existingHistory) {
        const historyEntry = await RideHistory.create({
          user: b.userId,
          date: tripDate,
          time: slot,
          tripType,
          pickupLocation: b.pickupLocation,
          dropLocation: b.dropLocation,
          routeNo: b.routeNo || schedule.routeId?.routeNo,
          routeId: b.routeId || schedule.routeId?._id,
          busId,
          busReg: bus?.regNumber,
          bookingId: b._id,
          seatNo,
          scheduleId: schedule._id,
        });

        historyCreated.push(historyEntry);
      }
    }

    return res.json({
      success: true,
      message: `${tripType} trip ended successfully`,
      schedule,
      affectedCount: updated.length,
      updatedBookings: updated,
      rideHistoryCreated: historyCreated.length,
    });
  } catch (err) {
    console.error("❌ endTrip error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
