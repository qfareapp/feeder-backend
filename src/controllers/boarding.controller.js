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

    // Extract reg number from QR
    const match = qrToken.match(/BUSQR-([a-zA-Z0-9]+)-/);
    const regNumber = match ? match[1].toUpperCase() : null;

    if (!regNumber) {
      return res.status(400).json({
        success: false,
        message: "Invalid QR format",
      });
    }

    // Lookup bus
    const bus = await Bus.findOne({
      regNumber: new RegExp(`^${regNumber}$`, "i"),
    });

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    // Lookup booking
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

    // Check if scanning pickup or drop
    const isPickupTrip =
      booking.pickupBusId?.toString() === bus._id.toString();
    const isDropTrip =
      booking.dropBusId?.toString() === bus._id.toString();

    if (!isPickupTrip && !isDropTrip) {
      return res.status(403).json({
        success: false,
        message: "This QR does not match your assigned bus.",
      });
    }

    // Identify trip type
    const tripType = isPickupTrip ? "pickup" : "drop";

    // BLOCK duplicate scanning
    if (tripType === "pickup" && booking.pickupBoarded) {
      return res.json({
        success: false,
        message: "Pickup already boarded.",
      });
    }

    if (tripType === "drop" && booking.dropBoarded) {
      return res.json({
        success: false,
        message: "Drop already boarded.",
      });
    }

    // Assign seat if not assigned
    const seatField = tripType === "pickup" ? "pickupSeatNo" : "dropSeatNo";

    if (!booking[seatField]) {
      const totalSeats = bus.seatingCapacity || 25;

      // get taken seats for THIS TRIP ONLY
      const takenSeats = await DailyBooking.find({
        date: booking.date,
        [tripType + "BusId"]: bus._id,
        [seatField]: { $ne: null },
      }).distinct(seatField);

      const availableSeats = Array.from(
        { length: totalSeats },
        (_, i) => i + 1
      ).filter((s) => !takenSeats.includes(s));

      if (availableSeats.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No seats left for this trip.",
        });
      }

      booking[seatField] =
        availableSeats[Math.floor(Math.random() * availableSeats.length)];
    }

    // Mark boarding for this trip
    if (tripType === "pickup") booking.pickupBoarded = true;
    if (tripType === "drop") booking.dropBoarded = true;

    await booking.save();

    console.log("✅ Boarding confirmed", {
      tripType,
      seatNo: booking[seatField],
    });

    return res.json({
      success: true,
      message: tripType + " boarding confirmed",
      tripType,
      seatNo: booking[seatField],
      busId: bus._id,
      regNumber: bus.regNumber,
    });
  } catch (err) {
    console.error("❌ Boarding error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during boarding confirmation",
    });
  }
};
export const getBoardingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await DailyBooking.findById(bookingId)
      .populate("pickupBusId dropBusId", "regNumber seatingCapacity")
      .lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.json({
      success: true,
      pickupBoarded: booking.pickupBoarded,
      dropBoarded: booking.dropBoarded,
      pickupSeatNo: booking.pickupSeatNo,
      dropSeatNo: booking.dropSeatNo,
      pickupBus: booking.pickupBusId,
      dropBus: booking.dropBusId,
      status: booking.status,
    });
  } catch (err) {
    console.error("❌ Booking status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
