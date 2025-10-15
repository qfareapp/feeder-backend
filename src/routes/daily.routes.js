import express from "express";
import Pass from "../models/pass.model.js";
import DailyBooking from "../models/dailyBooking.model.js";
import Route from "../models/route.model.js";
import BusSchedule from "../models/busSchedule.model.js";
import { DateTime } from "luxon";
import mongoose from "mongoose";

const router = express.Router();

/* ============================================================
   Helper: Normalize date (strip time)
   ============================================================ */
const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  return new Date(d.setHours(0, 0, 0, 0));
};

/* ============================================================
   ✅ Reserve a seat for a daily trip
   ============================================================ */
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      date,
      pickupSlot,
      dropSlot,
      pickupLocation,
      dropLocation,
      routeNo,
      routeId,
    } = req.body;

    console.log("📩 Daily booking request received:", req.body);

    if (!userId || !pickupSlot || !dropSlot || !routeNo) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // ✅ Step 1: Check user has an active pass
    const pass = await Pass.findOne({ userId, status: "Active" });
    if (!pass) {
      return res.status(403).json({ success: false, error: "No active pass" });
    }

    // ✅ Step 2: Prefer routeId / routeNo from request (frontend)
    let route = null;
    if (routeId && mongoose.Types.ObjectId.isValid(routeId)) {
      route = await Route.findById(routeId);
    }
    if (!route && routeNo) {
      route = await Route.findOne({ routeNo: routeNo.trim() });
    }

    // fallback if nothing found
    if (!route && pass.routeNo) {
      route = await Route.findOne({ routeNo: pass.routeNo });
      console.log("⚠️ Falling back to pass route:", pass.routeNo);
    }

    if (!route) {
      console.log("❌ Route not found for daily booking:", {
        passRouteId: pass.routeId,
        passRouteNo: pass.routeNo,
        requestedRouteNo: routeNo,
      });
      return res.status(404).json({ success: false, error: "Route not found" });
    }

    console.log("✅ Route found for daily booking:", route.routeNo, route._id);


    if (!route) {
      return res
        .status(404)
        .json({ success: false, error: "Route not found" });
    }

    // 3️⃣ Prepare day range for flexible date match
    // 3️⃣ Prepare day range for flexible date match (UTC-safe)
const startOfDay = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
  .startOf("day")
  .toJSDate();
const endOfDay = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
  .endOf("day")
  .toJSDate();

console.log("🔍 Looking for schedule (flex UTC):", {
  routeId: route._id,
  slot: pickupSlot,
  tripType: "pickup",
  dateRange: [startOfDay.toISOString(), endOfDay.toISOString()],
});

// 🟩 DEBUG: print all BusSchedules for this route
const debugSchedules = await BusSchedule.find({ routeId: route._id })
  .select("date slot tripType status totalSeats")
  .lean();
console.log("🗓️ All schedules for this route:", debugSchedules);

const schedule = await BusSchedule.findOne({
  routeId: route._id,
  slot: pickupSlot,
  tripType: "pickup",
  date: { $gte: startOfDay, $lt: endOfDay },
  status: { $regex: "^(Active|Scheduled)$", $options: "i" },
}).populate("routeId");

console.log("🚌 Found schedule:", schedule ? schedule._id : "❌ none");


    if (!schedule) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or inactive pickup slot" });
    }

    // 4️⃣ Validate drop location dynamically
    const routeRef = schedule.routeId;
    const normalizedStops = (routeRef.stops || []).map((s) =>
      s.toLowerCase().trim()
    );
    const normalizedStart = (routeRef.startPoint || "").toLowerCase().trim();
    const normalizedEnd = (routeRef.endPoint || "").toLowerCase().trim();
    const normalizedDrop = (dropLocation || "").toLowerCase().trim();

    console.log("🔍 Drop validation (via BusSchedule):", {
      dropLocation,
      normalizedStops,
      normalizedStart,
      normalizedEnd,
    });

    if (
      !normalizedStops.includes(normalizedDrop) &&
      normalizedDrop !== normalizedEnd &&
      normalizedDrop !== normalizedStart
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid drop location for this route" });
    }

    // 5️⃣ Check capacity
    const totalSeats = Number(schedule.totalSeats) || 25;

    const reservedCount = await DailyBooking.countDocuments({
  routeId: route._id,
  date: startOfDay,
  pickupSlot,
  status: { $in: ["reserved", "boarded"] },
});


    if (reservedCount >= totalSeats) {
      return res
        .status(400)
        .json({ success: false, error: "No seats available" });
    }

    // 6️⃣ Create booking
    // 6️⃣ Create booking (with separate buses for pickup & drop)
const booking = await DailyBooking.create({
  userId,
  date: startOfDay,
  pickupLocation: pickupLocation || pass.pickupLocation || route.startPoint,
  dropLocation: dropLocation || route.endPoint || pass.dropLocation,
  pickupSlot,
  dropSlot,
  status: "reserved",
  seatNo: null,
  routeId: route._id,
  routeNo: route.routeNo,

  // 🚌 assign pickup and drop bus IDs separately
  pickupBusId: schedule?.busId || null, // from the pickup schedule
  dropBusId: null, // will assign if drop schedule found later
});

// 7️⃣ Optionally find a drop schedule (evening return bus)
let dropSchedule = null;
if (dropSlot) {
  dropSchedule = await BusSchedule.findOne({
    routeId: route._id,
    slot: dropSlot,
    tripType: "drop",
    date: { $gte: startOfDay, $lt: endOfDay },
    status: { $regex: "^(Active|Scheduled)$", $options: "i" },
  });
  if (dropSchedule && dropSchedule.busId) {
    booking.dropBusId = dropSchedule.busId;
    await booking.save();
  }
}

// 8️⃣ Populate both buses for frontend ticket view
const enrichedBooking = await DailyBooking.findById(booking._id)
  .populate("pickupBusId", "regNumber driverName driverContact")
  .populate("dropBusId", "regNumber driverName driverContact")
  .populate("routeId", "routeNo startPoint endPoint");

res.json({ success: true, booking: enrichedBooking });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "Already booked for this slot",
      });
    }
    console.error("❌ Error in daily booking:", err);
    res
      .status(500)
      .json({ success: false, error: "Server error, please try again" });
  }
});

/* ============================================================
   ✅ Boarding via QR Scan — Assign seat number dynamically
   ============================================================ */
router.post("/board", async (req, res) => {
  try {
    const { userId, date, pickupSlot, busId } = req.body;
    const travelDate = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
  .startOf("day")
  .toJSDate();

    const booking = await DailyBooking.findOne({
      userId,
      date: travelDate,
      pickupSlot,
      status: "reserved",
    });

    if (!booking) {
      return res
        .status(400)
        .json({ success: false, error: "No reserved booking found" });
    }

    const boardedCount = await DailyBooking.countDocuments({
      date: travelDate,
      pickupSlot,
      busId,
      status: "boarded",
    });

    booking.seatNo = boardedCount + 1;
    booking.status = "boarded";
    booking.busId = busId;
    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ Error in boarding:", err);
    res
      .status(500)
      .json({ success: false, error: "Server error, please try again" });
  }
});

/* ============================================================
   ✅ Fetch active bus schedules (for daily screen)
   ============================================================ */
router.get("/availability", async (req, res) => {
  try {
    const { userId, routeNo, date, onlyActive } = req.query;
    console.log("🔍 Availability request:", req.query);

    // 🧱 1️⃣ Validate input
    if (!date || date === "undefined") {
      return res
        .status(400)
        .json({ success: false, error: "Missing or invalid date" });
    }

    // 🧱 2️⃣ Resolve route dynamically
    let route = null;

    if (routeNo) {
      route = await Route.findOne({ routeNo });
    } else if (userId) {
      const pass = await Pass.findOne({ userId });
      if (pass) {
        route = await Route.findOne({
          $or: [
            { _id: pass.routeId },
            { routeNo: pass.routeNo }
          ],
        });
        if (route && (!pass.routeId || !pass.routeId.equals(route._id))) {
      await Pass.updateOne({ _id: pass._id }, { $set: { routeId: route._id } });
      console.log(`🛠️ Auto-fixed routeId for pass ${pass._id}`);
    }
  }
}

    

    if (!route) {
      return res.status(404).json({
        success: false,
        error: "Route not found (check user pass or routeNo)",
      });
    }

    // 🕐 3️⃣ Prepare IST-safe date range
    const startOfDay = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
      .startOf("day")
      .toJSDate();
    const endOfDay = DateTime.fromISO(date, { zone: "Asia/Kolkata" })
      .endOf("day")
      .toJSDate();

    console.log("🕐 IST Filter Range:", startOfDay, "→", endOfDay);

    // 🚌 4️⃣ Query active schedules for this route & date
    const query = {
      routeId: route._id,
      date: { $gte: startOfDay, $lt: endOfDay },
    };
    if (onlyActive === "true") query.status = { $regex: "^active$", $options: "i" };

    console.log("🔍 Querying schedules with:", query);

    const schedules = await BusSchedule.find(query).lean();
    console.log("🚌 Found schedules:", schedules.length);

    if (!schedules.length) {
      return res.json({
        success: true,
        data: [],
        message: "No schedules found for this route/date",
      });
    }

    // 🎟️ 5️⃣ Aggregate seat bookings
    const bookings = await DailyBooking.aggregate([
      {
        $match: {
  routeId: route._id,
  date: startOfDay,
  status: { $in: ["reserved", "boarded"] },
}
      },
      { $group: { _id: "$pickupSlot", count: { $sum: 1 } } },
    ]);

    const bookingMap = {};
    bookings.forEach((b) => (bookingMap[b._id] = b.count));

    // 🧮 6️⃣ Calculate availability
    const result = schedules.map((s) => ({
      slot: s.slot,
      tripType: s.tripType,
      status: s.status,
      totalSeats: s.totalSeats,
      booked: bookingMap[s.slot] || s.booked || 0,
      available: Math.max(
        0,
        (Number(s.totalSeats) || 0) - (bookingMap[s.slot] || s.booked || 0)
      ),
      busId: s.busId,
      societyId: s.societyId,
      startTime: s.startTime,
      endTime: s.endTime,
    }));

    // ✅ Final response
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("❌ Error loading availability:", err);
    return res
      .status(500)
      .json({ success: false, error: "Server error, please try again" });
  }
});

/* ============================================================
   ✅ Ticket lookup
   ============================================================ */
router.get("/:id", async (req, res) => {
  try {
    const booking = await DailyBooking.findById(req.params.id)
      .populate({
        path: "pickupBusId",
        select: "regNumber driverName driverContact",
      })
      .populate({
        path: "dropBusId",
        select: "regNumber driverName driverContact",
      })
      .populate({
        path: "routeId",
        select: "routeNo startPoint endPoint",
      })
      .lean();

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, error: "Booking not found" });
    }

    // 🎯 Map for frontend readability
    const ticketData = {
      ...booking,
      routeNo: booking.routeNo || booking.routeId?.routeNo,
      routeStart: booking.routeId?.startPoint,
      routeEnd: booking.routeId?.endPoint,

      // 🚌 Pickup bus info
      pickupBus: booking.pickupBusId
        ? {
            number: booking.pickupBusId.regNumber,
            driverName: booking.pickupBusId.driverName,
            driverPhone: booking.pickupBusId.driverContact,
          }
        : null,

      // 🚌 Drop bus info
      dropBus: booking.dropBusId
        ? {
            number: booking.dropBusId.regNumber,
            driverName: booking.dropBusId.driverName,
            driverPhone: booking.dropBusId.driverContact,
          }
        : null,
    };

    res.json({ success: true, booking: ticketData });
  } catch (err) {
    console.error("❌ Error fetching booking:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


router.get("/active/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date();

    const booking = await DailyBooking.findOne({
      userId,
      date: { $gte: today.setHours(0, 0, 0, 0) },
      status: { $in: ["reserved", "boarded"] },
    })
      .sort({ createdAt: -1 })
      .populate("pickupBusId", "regNumber driverName driverContact")
      .populate("dropBusId", "regNumber driverName driverContact")
      .populate("routeId", "routeNo startPoint endPoint");

    if (!booking)
      return res.json({ success: false, message: "No active booking" });

    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ Error fetching active booking:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});



export default router;
