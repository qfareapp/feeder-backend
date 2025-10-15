import Bus from "../models/bus.model.js";
import DailyBooking from "../models/dailyBooking.model.js";

export const confirmBoarding = async (req, res) => {
  try {
    const { userId, bookingId, qrToken } = req.body;
    console.log("🧾 Incoming boarding request:", { userId, bookingId, qrToken });

    if (!userId || !bookingId || !qrToken) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // 🧠 Extract regNumber safely from QR
    const regMatch = qrToken.match(/BUSQR-([a-zA-Z0-9]+)-/);
    const regNumber = regMatch ? regMatch[1].toUpperCase() : null;

    if (!regNumber) {
      console.error("❌ Invalid QR token:", qrToken);
      return res.status(400).json({
        success: false,
        message: "Invalid QR code format",
      });
    }

    // 🔍 Find bus by registration number (case-insensitive)
    const bus = await Bus.findOne({ regNumber: new RegExp(`^${regNumber}$`, "i") });
    if (!bus) {
      console.error("❌ Bus not found for regNumber:", regNumber);
      return res.status(404).json({
        success: false,
        message: "Bus not found for this QR code",
      });
    }
    console.log("✅ Found bus:", bus.regNumber);

    // 🔎 Find the user’s active booking
    const booking = await DailyBooking.findOne({
      _id: bookingId,
      userId,
      status: "reserved",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "No pending reservation found or already boarded.",
      });
    }
    console.log("✅ Found booking:", booking._id);

    // 🚍 Verify bus assignment
    const thisBus =
      booking.pickupBusId?.toString() === bus._id.toString()
        ? "pickup"
        : booking.dropBusId?.toString() === bus._id.toString()
        ? "drop"
        : null;

    console.log("🚍 Matched bus type:", thisBus);
    if (!thisBus) {
      return res.status(400).json({
        success: false,
        message: "This bus is not assigned for this booking.",
      });
    }

    // 🪑 Seat allocation if not already assigned
    if (!booking.seatNo) {
      const totalSeats = bus.seatingCapacity || 25;
      const takenSeats = await DailyBooking.find({
        date: booking.date,
        $or: [{ pickupBusId: bus._id }, { dropBusId: bus._id }],
        seatNo: { $ne: null },
      }).distinct("seatNo");

      const availableSeats = Array.from({ length: totalSeats }, (_, i) => i + 1)
        .filter((s) => !takenSeats.includes(s));

      if (availableSeats.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No available seats on this bus",
        });
      }

      booking.seatNo =
        availableSeats[Math.floor(Math.random() * availableSeats.length)];
    }

    booking.status = "boarded";
    booking.boarded = true;
    await booking.save();

    console.log("✅ Boarding confirmed:", {
      userId,
      bookingId,
      seatNo: booking.seatNo,
      busId: bus._id,
    });

    return res.json({
      success: true,
      message: "Boarding confirmed",
      seatNo: booking.seatNo,
      busId: bus._id,
      regNumber: bus.regNumber,
    });
  } catch (err) {
    console.error("❌ Boarding confirm error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while confirming boarding",
    });
  }
};

export const getBoardingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await DailyBooking.findById(bookingId)
      .populate("pickupBusId dropBusId", "regNumber seatingCapacity")
      .lean();

    if (!booking)
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });

    res.json({
      success: true,
      boarded: booking.boarded,
      seatNo: booking.seatNo,
      status: booking.status,
      pickupBus: booking.pickupBusId,
      dropBus: booking.dropBusId,
    });
  } catch (err) {
    console.error("❌ Error fetching boarding status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
