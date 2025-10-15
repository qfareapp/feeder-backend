import Bus from "../models/bus.model.js";
import QRCode from "qrcode";

// GET all buses
export const getBuses = async (req, res) => {
  try {
    const buses = await Bus.find();
    res.json(buses);
  } catch (err) {
    console.error("❌ Error fetching buses:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST add new bus
export const addBus = async (req, res) => {
  try {
    const busData = req.body;

    // ✅ 1. Set default password if none is provided
    if (!busData.password && busData.regNumber) {
      busData.password = `${busData.regNumber}@123`;
    }

    // ✅ 2. Create bus (password hashed automatically)
    const bus = new Bus(busData);
    await bus.save();

    // ✅ 3. Generate unique QR token (for backend lookup)
    const qrToken = `BUSQR-${bus.regNumber.toLowerCase()}-${Date.now()}`;
    bus.qrToken = qrToken;

    // ✅ 4. Create structured QR payload
    const qrPayload = {
      qrToken,
      bus_id: bus._id,
      regNumber: bus.regNumber,
    };

    // ✅ 5. Generate QR code (base64)
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrPayload));
    bus.qrCode = qrCode;

    // ✅ 6. Save once
    await bus.save();

    // ✅ 7. Return response
    res.status(201).json({
      success: true,
      bus,
      defaultPassword: busData.password, // ⚠️ only show once
    });

    console.log(`✅ New bus onboarded: ${bus.regNumber}`);
    console.log(`🧾 QR Token: ${qrToken}`);
  } catch (err) {
    console.error("❌ Error adding bus:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
