import express from "express";
import Bus from "../models/bus.model.js";

const router = express.Router();

/**
 * ADMIN — Reset Driver Password
 */

router.post("/reset-password", async (req, res) => {
  try {
    const { regNumber, newPassword } = req.body;

    if (!regNumber || !newPassword) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const bus = await Bus.findOne({ regNumber });
    if (!bus) {
      return res.status(404).json({ success: false, error: "Bus not found" });
    }

    // Set new password — will auto-hash using pre-save hook
    bus.password = newPassword;
    await bus.save();

    return res.json({
      success: true,
      message: `Driver password reset to "${newPassword}" successfully!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
