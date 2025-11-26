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

    // ✅ Allow one-way either pickup or drop slot
if (!userId || !routeNo || (!pickupSlot && !dropSlot)) {
  return res
    .status(400)
    .json({ success: false, error: "Missing required fields (need pickupSlot or dropSlot)" });
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

let schedule = null;
let tripType = pickupSlot ? "pickup" : "drop";
const slotToUse = pickupSlot || dropSlot;

console.log("🔍 Looking for schedule:", { tripType, slotToUse });

schedule = await BusSchedule.findOne({
  routeId: route._id,
  slot: slotToUse,
  tripType,
  date: { $gte: startOfDay, $lt: endOfDay },
  status: { $regex: "^(Active|Scheduled)$", $options: "i" },
}).populate("routeId");

if (!schedule) {
  return res
    .status(400)
    .json({ success: false, error: "Invalid or inactive trip slot" });
}


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

 // 5️⃣.5️⃣ Prevent duplicate booking by same user
const existingBooking = await DailyBooking.findOne({
  userId,
  date: startOfDay,
  $or: [{ pickupSlot }, { dropSlot }],
  status: { $in: ["reserved", "boarded"] },
});

if (existingBooking) {
  return res.status(400).json({
    success: false,
    error: "You have already booked for this date and slot.",
  });
}
    // 6️⃣ Create booking (with separate buses for pickup & drop)
const booking = await DailyBooking.create({
  userId,
  date: startOfDay,
  pickupLocation: pickupLocation || pass.pickupLocation || route.startPoint,
  dropLocation: dropLocation || pass.dropLocation || route.endPoint,
  pickupSlot: pickupSlot || null,
  dropSlot: dropSlot || null,
  status: "reserved",
  seatNo: null,
  routeId: route._id,
  routeNo: route.routeNo,
  pickupBusId: tripType === "pickup" ? schedule?.busId || null : null,
  dropBusId: tripType === "drop" ? schedule?.busId || null : null,
  scheduleId: schedule?._id || null,
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

    // Treat pickupSlot as a generic slot param (can be drop slot too)
    const booking = await DailyBooking.findOne({
      userId,
      date: travelDate,
      $or: [{ pickupSlot }, { dropSlot: pickupSlot }],
      status: { $in: ["reserved", "boarded"] },
    });

    if (!booking) {
      return res
        .status(400)
        .json({ success: false, error: "No reserved booking found" });
    }

    // Determine which segment is being boarded
    const tripType =
      booking.dropSlot && booking.dropSlot === pickupSlot ? "drop" : "pickup";

    const seatFilter =
      tripType === "pickup"
        ? { date: travelDate, pickupSlot, status: "boarded" }
        : { date: travelDate, dropSlot: pickupSlot, status: "boarded" };

    const boardedCount = await DailyBooking.countDocuments(seatFilter);
    const seatNo = boardedCount + 1;

    if (tripType === "pickup") {
      booking.pickupSeatNo = seatNo;
      booking.pickupBoarded = true;
      booking.pickupBusId = busId || booking.pickupBusId;
    } else {
      booking.dropSeatNo = seatNo;
      booking.dropBoarded = true;
      booking.dropBusId = busId || booking.dropBusId;
    }

    booking.status = "boarded";
    await booking.save();

    res.json({ success: true, booking, seatNo, tripType });
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

    // 🎟️ 5️⃣ Aggregate seat bookings (both pickup & drop)
const bookings = await DailyBooking.aggregate([
  {
    $match: {
      routeId: route._id,
      date: startOfDay,
      status: { $in: ["reserved", "boarded"] },
    },
  },
  {
    $project: {
      pickupSlot: 1,
      dropSlot: 1,
    },
  },
  {
    $facet: {
      pickup: [
        { $group: { _id: "$pickupSlot", count: { $sum: 1 } } },
      ],
      drop: [
        { $group: { _id: "$dropSlot", count: { $sum: 1 } } },
      ],
    },
  },
]);

const bookingMap = {};
if (bookings.length) {
  bookings[0].pickup.forEach((b) => (bookingMap[b._id] = b.count));
  bookings[0].drop.forEach((b) => (bookingMap[b._id] = b.count));
}

// 🧮 6️⃣ Calculate availability per schedule
const result = schedules.map((s) => {
  const bookedCount = bookingMap[s.slot] || s.booked || 0;
  return {
    slot: s.slot,
    tripType: s.tripType,
    status: s.status,
    totalSeats: s.totalSeats,
    booked: bookedCount,
    available: Math.max(0, (Number(s.totalSeats) || 0) - bookedCount),
    busId: s.busId,
    societyId: s.societyId,
    startTime: s.startTime,
    endTime: s.endTime,
  };
});

return res.json({ success: true, data: result });

  } catch (err) {
    console.error("❌ Error loading availability:", err);
    return res
      .status(500)
      .json({ success: false, error: "Server error, please try again" });
  }
});
router.get("/active/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Use IST day boundaries to avoid off-by-one when server is in another TZ
    const todayIST = DateTime.now()
      .setZone("Asia/Kolkata")
      .startOf("day")
      .toJSDate();

    const booking = await DailyBooking.findOne({
      userId,
      date: { $gte: todayIST },
      status: { $in: ["reserved", "boarded"] },
      completed: false,
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





export default router;
