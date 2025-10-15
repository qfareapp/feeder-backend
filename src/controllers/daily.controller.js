import Pass from "../models/pass.model.js";
import DailyBooking from "../models/dailyBooking.model.js";
import Route from "../models/route.model.js";
import mongoose from "mongoose";

export const reserveDailyBooking = async (req, res) => {
  try {
    const {
      userId,
      date,
      pickupSlot,
      dropSlot,
      dropLocation,
      routeId,
      routeNo, // 👈 include these from frontend
    } = req.body;

    // 1️⃣ Validate pass
    const pass = await Pass.findOne({ userId, status: "Active" });
    if (!pass) {
      return res
        .status(403)
        .json({ success: false, error: "No active pass found" });
    }

    // 2️⃣ Determine route from body → fallback to pass
    let finalRouteId = routeId || pass.routeId;
    let finalRouteNo = routeNo || pass.routeNo;
    // 🧭 Debug Log — to trace route resolution
console.log("🧭 Checking route for booking:", {
  routeIdFromBody: routeId,
  routeNoFromBody: routeNo,
  routeIdFromPass: pass.routeId,
  routeNoFromPass: pass.routeNo,
  finalRouteId,
  finalRouteNo,
  typeOfRouteId: typeof finalRouteId,
});


    // 3️⃣ Validate route
    let route = null;
    if (finalRouteId && mongoose.Types.ObjectId.isValid(finalRouteId)) {
      route = await Route.findById(finalRouteId);
    }
    if (!route && finalRouteNo) {
      route = await Route.findOne({ routeNo: finalRouteNo });
    }

    if (!route) {
      console.warn("❌ Route not found for:", { finalRouteId, finalRouteNo });
      return res
        .status(404)
        .json({ success: false, error: "Route not found" });
    }

    console.log("✅ Found route:", route.routeNo, route._id);

    // 4️⃣ Validate drop location
    const stopsList = [route.startPoint, ...(route.stops || []), route.endPoint];
    if (!stopsList.includes(dropLocation)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid drop location" });
    }

    // 5️⃣ Validate schedule
    const schedule = route.tripSchedules.find(
      (s) => s.slot === pickupSlot && s.tripType === "pickup"
    );
    if (!schedule) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid pickup slot" });
    }

    if (schedule.status?.toLowerCase() !== "active") {
      return res
        .status(400)
        .json({ success: false, error: "This slot is inactive" });
    }

    // 6️⃣ Seat management
    const definedSeats = Number(schedule.seats);
    const busCapacity = 25;
    const bufferSeats = busCapacity - definedSeats;
    const maxSeatsAllowed =
      pickupSlot === pass.pickupSlot ? busCapacity : bufferSeats;

    const reservedCount = await DailyBooking.countDocuments({
      date,
      pickupSlot,
      status: "reserved",
    });

    if (reservedCount >= maxSeatsAllowed) {
      return res
        .status(400)
        .json({ success: false, error: "No seats available" });
    }
    // 🧭 Log final data before saving
console.log("🎯 Final booking data ->", {
  userId,
  routeNo: route.routeNo,
  fromFrontend: req.body.pickupLocation,
  fromPass: pass.pickupLocation,
  fromRoute: route.startPoint,
  toFrontend: req.body.dropLocation,
  toRoute: route.endPoint,
});
    // 7️⃣ Create booking
    const booking = await DailyBooking.create({
      userId,
      date,
      routeId: route._id,
      routeNo: route.routeNo,
      pickupLocation: req.body.pickupLocation || route.startPoint,
      dropLocation: req.body.dropLocation || route.endPoint,
      pickupSlot,
      dropSlot,
      busId: schedule.busId,
      status: "reserved",
      seatNo: null,
    });

    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ reserveDailyBooking error:", err.message);
    res.status(500).json({ success: false, error: "Server error" });
  }
};


/**
 * Boarding via QR scan → Assign seat number
 */
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
      return res.status(400).json({ success: false, error: "No reserved booking found" });
    }

    const boarded = await DailyBooking.find({
      date,
      pickupSlot,
      busId,
      status: "boarded",
    });
    const seatNo = boarded.length + 1;

    booking.seatNo = seatNo;
    booking.status = "boarded";
    booking.busId = busId;
    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
