import express from "express";
import Bus from "../models/bus.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /api/driver/login
router.post("/login", async (req, res) => {
  try {
    const { regNumber, password } = req.body;

    // find bus by regNumber
    const bus = await Bus.findOne({ regNumber });
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    if (!bus.password) {
      return res
        .status(400)
        .json({ success: false, error: "No password set for this bus. Please reset or re-onboard." });
    }

    // compare hashed passwords
    const isMatch = await bcrypt.compare(password, bus.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    // issue JWT
    const token = jwt.sign(
      { busId: bus._id, regNumber: bus.regNumber },
      process.env.JWT_SECRET || "secret123", // ✅ fallback
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token,
      busId: bus._id,
      regNumber: bus.regNumber,
    });
  } catch (err) {
    console.error("❌ Driver login error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
