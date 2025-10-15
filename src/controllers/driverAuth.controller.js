import Bus from "../models/bus.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export const driverLogin = async (req, res) => {
  try {
    const { regNumber, password } = req.body;
    const bus = await Bus.findOne({ regNumber });

    if (!bus) return res.status(404).json({ error: "Bus not found" });

    const isMatch = await bcrypt.compare(password, bus.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ busId: bus._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token, busId: bus._id, regNumber: bus.regNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
