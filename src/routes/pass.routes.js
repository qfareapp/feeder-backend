// routes/pass.routes.js
import express from "express";
import Pass from "../models/pass.model.js";
import User from "../models/User.js";
import Route from "../models/route.model.js";
import { generateTicketId } from "../utils/generateTicketId.js";
import mongoose from "mongoose";

const router = express.Router();

/**
 * ✅ Book a new pass
 * POST /api/passes
 */

router.post("/", async (req, res) => {
  try {
    console.log("📩 Pass booking request received:", req.body);
    const {
      userId,
      pickupLocation,
      dropLocation,
      pickupSlot,
      dropSlot,
      durationDays,
      price,
      routeNo, // 👈 make sure frontend sends this
       routeId,
    } = req.body;

    if (
      !userId ||
      !pickupLocation ||
      !dropLocation ||
      !pickupSlot ||
      !dropSlot ||
      !durationDays ||
      !price ||
      (!routeNo && !routeId)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }


    // ✅ Find route by either routeId or routeNo

    // 🧭 DEBUG: Enhanced Route Lookup Logging
    let route = null;
    console.log("🧭 Checking route lookup:", {
      routeId,
      routeNo,
      isValid: mongoose.Types.ObjectId.isValid(routeId),
      type: typeof routeId,
    });

    try {
      if (routeId && mongoose.Types.ObjectId.isValid(routeId)) {
        route = await Route.findById(routeId);
        console.log("🔎 Route found by ID:", !!route, route?._id?.toString());
      } else {
        console.log("⚠️ routeId not valid ObjectId, skipping findById()");
      }

      if (!route && routeNo) {
        route = await Route.findOne({ routeNo: routeNo.trim() });
        console.log("🔎 Route found by routeNo:", !!route, route?._id?.toString());
      }
    } catch (err) {
      console.error("⚠️ Error while querying route:", err.message);
    }

    if (!route) {
      console.log("❌ Final route lookup failed.", { routeId, routeNo });
      return res.status(404).json({ success: false, error: "Route not found" });
    }

    console.log("✅ Final route lookup success:", route.routeNo, route._id.toString());
    // ✅ Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, error: "User not found" });
    }
    
    // ✅ Check pickup slot availability
    const pickupTrip = await Route.findOne(
      { routeNo, "tripSchedules.slot": pickupSlot, "tripSchedules.tripType": "pickup" },
      { "tripSchedules.$": 1 }
    );
    if (!pickupTrip || pickupTrip.tripSchedules[0].booked >= pickupTrip.tripSchedules[0].seats) {
      return res.status(400).json({ success: false, error: "Pickup slot is full" });
    }

    // ✅ Check drop slot availability
    const dropTrip = await Route.findOne(
      { routeNo, "tripSchedules.slot": dropSlot, "tripSchedules.tripType": "drop" },
      { "tripSchedules.$": 1 }
    );
    if (!dropTrip || dropTrip.tripSchedules[0].booked >= dropTrip.tripSchedules[0].seats) {
      return res.status(400).json({ success: false, error: "Drop slot is full" });
    }
    // ✅ Calculate validity period
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);

    // ✅ Generate ticket ID (with route + serials)
    const { ticketId, routeSerial, overallSerial } = await generateTicketId(routeNo);
    

    // ✅ Create new pass
    const newPass = new Pass({
  userId,
  pickupLocation,
  dropLocation,
  pickupSlot,
  dropSlot,
  startDate,
  endDate,
  durationDays,
  price,
  status: "Active",
  routeId: route._id,
  routeNo: route.routeNo,                   // keep the routeNo field
  routeSerial,
  overallSerial,
  ticketId,
});

   await newPass.save();

    // ✅ Increment booked counts
    await Route.updateOne(
      {
        routeNo: route.routeNo,
        "tripSchedules.slot": pickupSlot,
        "tripSchedules.tripType": "pickup",
      },
      { $inc: { "tripSchedules.$.booked": 1 } }
    );

    await Route.updateOne(
      {
        routeNo: route.routeNo,
        "tripSchedules.slot": dropSlot,
        "tripSchedules.tripType": "drop",
      },
      { $inc: { "tripSchedules.$.booked": 1 } }
    );

    res.json({
  success: true,
  pass: {
    _id: newPass._id,
    name: user.name,
    pickupLocation,
    dropLocation,
    pickupSlot,
    dropSlot,
    price,
    purchaseDate: startDate,
    validTill: endDate,
    durationDays,
    routeId: route._id,
        routeNo: route.routeNo,
    routeSerial,
    overallSerial,
    ticketId,
    status: "Active",
  },
});
  } catch (err) {
    console.error("Book pass error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
/**
 * GET /api/passes/user/:userId
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Find latest active pass (filter by validity)
    const today = new Date();
    const pass = await Pass.findOne({
      userId,
      endDate: { $gte: today }, // only valid passes
    }).sort({ createdAt: -1 });

    if (!pass) {
      return res.status(404).json({ success: false, error: "No active pass" });
    }

    // Also fetch user details for name
    const user = await User.findById(userId).select("name");

    res.json({
      success: true,
      pass: {
        ...pass.toObject(),
        name: user?.name || "User",
        purchaseDate: pass.startDate,
        validTill: pass.endDate,
      },
    });
  } catch (err) {
    console.error("Fetch pass error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
