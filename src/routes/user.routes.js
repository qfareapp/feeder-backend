import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserOnboarding from "../models/UserOnboarding.js";
import User from "../models/User.js"; // schema with password field

const router = express.Router();

/**
 * 🔹 Helper function to generate JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

/**
 * ✅ Onboarding (old flow, without password)
 * POST /api/user/onboarding
 */
router.post("/onboarding", async (req, res) => {
  try {
    const { name, email, phone, society, timing } = req.body;
    if (!name || !email || !phone || !society || !timing) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const user = new UserOnboarding({ name, email, phone, society, timing });
    await user.save();

    res.json({ success: true, message: "Onboarding saved ✅", user });
  } catch (err) {
    console.error("Onboarding error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * ✅ Signup (new flow with password + JWT)
 * POST /api/user/signup
 */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, phone, society, timing, password } = req.body;

    if (!name || !email || !phone || !society || !timing || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // check duplicate user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      phone,
      society,
      timing,
      password: hashed,
    });

    await user.save();

    // generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Signup successful ✅",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        society: user.society,
        timing: user.timing,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * ✅ Login (check email + password, return JWT)
 * POST /api/user/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: "Login successful ✅",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        society: user.society,
        timing: user.timing,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
