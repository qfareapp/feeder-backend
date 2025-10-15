// controllers/pass.controller.js
import mongoose from "mongoose";
import Pass from "../models/Pass.js";
import Route from "../models/route.model.js";
import { generateTicketId } from "../utils/generateTicketId.js";

export const createPass = async (req, res) => {
  try {
    const {
      userId,
      pickupLocation,
      dropLocation,
      pickupSlot,
      dropSlot,
      price,
      durationDays,
      routeNo,
      routeId, // ✅ new
    } = req.body;

    if (
      !userId ||
      !pickupLocation ||
      !dropLocation ||
      !pickupSlot ||
      !dropSlot ||
      !price ||
      !durationDays ||
      (!routeNo && !routeId)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required" });
    }

    // ✅ Find route by ID first, fallback to routeNo
    let route = null;
    if (routeId && mongoose.Types.ObjectId.isValid(routeId)) {
      route = await Route.findById(routeId);
    }
    if (!route && routeNo) {
      route = await Route.findOne({ routeNo });
    }

    if (!route) {
      return res
        .status(404)
        .json({ success: false, error: "Route not found" });
    }

    // ✅ Generate ticket ID
    const { ticketId, routeSerial, overallSerial } =
      await generateTicketId(route.routeNo);

    // ✅ Create and save pass with both routeId + routeNo
    const pass = new Pass({
      userId,
      pickupLocation,
      dropLocation,
      pickupSlot,
      dropSlot,
      price,
      durationDays,
      routeId: route._id, // ✅ store for backend logic
      routeNo: route.routeNo, // ✅ display friendly
      routeSerial,
      overallSerial,
      ticketId,
      status: "Active",
    });

    await pass.save();

    res.status(201).json({
      success: true,
      pass: {
        _id: pass._id,
        pickupLocation,
        dropLocation,
        pickupSlot,
        dropSlot,
        durationDays,
        price,
        routeNo: route.routeNo,
        ticketId,
        validTill: pass.endDate,
        status: "Active",
      },
    });
  } catch (err) {
    console.error("❌ Error creating pass:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
