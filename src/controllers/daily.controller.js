import Pass from "../models/pass.model.js";
import DailyBooking from "../models/dailyBooking.model.js";
import Route from "../models/route.model.js";
import BusSchedule from "../models/busSchedule.model.js";
import mongoose from "mongoose";

export const reserveDailyBooking = async (req, res) => {
  try {
    const {
      userId,
      date,
      pickupSlot,
      dropSlot,
      pickupLocation,
      dropLocation,
      routeId,
      routeNo,
    } = req.body;

    console.log("🧾 Incoming booking request body:", req.body);

    // ✅ Allow either pickup or drop slot (for one-way flexibility)
    if (!userId || !date || !routeNo || (!pickupSlot && !dropSlot)) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // 1️⃣ Validate pass
    const pass = await Pass.findOne({ userId, status: "Active" });
    if (!pass) {
      return res
        .status(403)
        .json({ success: false, error: "No active pass found" });
    }

    // 2️⃣ Determine route
    let finalRouteId = routeId || pass.routeId;
    let finalRouteNo = routeNo || pass.routeNo;
    let route = null;

    if (finalRouteId && mongoose.Types.ObjectId.isValid(finalRouteId)) {
      route = await Route.findById(finalRouteId);
    }
    if (!route && finalRouteNo) {
      route = await Route.findOne({ routeNo: finalRouteNo });
    }
    if (!route) {
      return res.status(404).json({ success: false, error: "Route not found" });
    }

    console.log("✅ Found route:", route.routeNo, route._id);

    // 3️⃣ Validate drop location (optional)
    const stopsList = [route.startPoint, ...(route.stops || []), route.endPoint];
    if (dropLocation && !stopsList.includes(dropLocation)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid drop location" });
    }

    // 4️⃣ Determine active trip type
    const tripType = pickupSlot ? "pickup" : "drop";
    const slotToUse = pickupSlot || dropSlot;

    console.log("🧭 Active tripType:", tripType, "slot:", slotToUse);

    // 5️⃣ Validate schedule (lookup in BusSchedule collection)
    const schedule = await BusSchedule.findOne({
      routeId: route._id,
      slot: slotToUse,
      tripType,
      status: { $regex: "^(Active|Scheduled)$", $options: "i" },
    });

    if (!schedule) {
      return res
        .status(400)
        .json({ success: false, error: `Invalid or inactive ${tripType} slot` });
    }

    // 6️⃣ Capacity check
    const reservedCount = await DailyBooking.countDocuments({
      date,
      [tripType === "pickup" ? "pickupSlot" : "dropSlot"]: slotToUse,
      status: { $in: ["reserved", "boarded"] },
    });

    if (reservedCount >= schedule.totalSeats) {
      return res
        .status(400)
        .json({ success: false, error: "No seats available for this slot" });
    }

    // 7️⃣ Prevent duplicate booking
    const existingBooking = await DailyBooking.findOne({
      userId,
      date,
      $or: [{ pickupSlot }, { dropSlot }],
      status: { $in: ["reserved", "boarded"] },
    });
    if (existingBooking) {
      return res.status(400).json({
        success: false,
        error: "You have already booked for this date and slot.",
      });
    }

    // 8️⃣ Create booking
    const booking = await DailyBooking.create({
      userId,
      date,
      routeId: route._id,
      routeNo: route.routeNo,
      pickupLocation: pickupLocation || pass.pickupLocation || route.startPoint,
      dropLocation: dropLocation || pass.dropLocation || route.endPoint,
      pickupSlot: pickupSlot || null,
      dropSlot: dropSlot || null,
      pickupBusId: tripType === "pickup" ? schedule.busId : null,
      dropBusId: tripType === "drop" ? schedule.busId : null,
      status: "reserved",
      seatNo: null,
    });

    console.log("✅ Booking created successfully:", booking._id);

    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ reserveDailyBooking error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/* ===========================================================
   🧾 Boarding controller (unchanged)
   =========================================================== */
export const boardDailyBooking = async (req, res) => {
  try {
    const { userId, date, pickupSlot, busId } = req.body;

    const booking = await DailyBooking.findOne({
      userId,
      date,
      pickupSlot,
      status: "reserved",
    });
    if (!booking) {
      return res
        .status(400)
        .json({ success: false, error: "No reserved booking found" });
    }

    const boardedCount = await DailyBooking.countDocuments({
      date,
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
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
/* ===========================================================
   🟦 Get Active Booking (User App)
   =========================================================== */
export const getActiveBooking = async (req, res) => {
  try {
    const { userId } = req.params;

    const booking = await DailyBooking.findOne({
      userId,
      status: "reserved",    // user has only reserved/boarded seats
      completed: false,      // ⭐ MOST IMPORTANT
    })
      .populate("pickupBusId")
      .populate("dropBusId")
      .populate("routeId");

    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ getActiveBooking error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};