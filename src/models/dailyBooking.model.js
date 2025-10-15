import mongoose from "mongoose";

const dailyBookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route", // ✅ allows populate('routeId')
    },

    routeNo: {
      type: String,
    },

    date: {
      type: Date,
      required: true, // travel day
    },

    pickupLocation: {
      type: String,
      required: true,
    },

    dropLocation: {
      type: String,
      required: true,
    },

    pickupSlot: {
      type: String,
      required: true,
    },

    dropSlot: {
      type: String,
    },

    seatNo: {
      type: Number,
      default: null, // assigned only after boarding
    },

    status: {
      type: String,
      enum: ["reserved", "boarded", "cancelled"],
      default: "reserved",
    },
    // ✅ Whether user actually boarded (on QR scan)
    boarded: {
      type: Boolean,
      default: false,
    },
    // 🚌 Two different buses — one for pickup, one for drop
    pickupBusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
    },

    dropBusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
    },
  },
  { timestamps: true }
);

// ✅ Prevent double-booking for same user/date/slot
dailyBookingSchema.index({ userId: 1, date: 1, pickupSlot: 1 }, { unique: true });

export default mongoose.model("DailyBooking", dailyBookingSchema);
