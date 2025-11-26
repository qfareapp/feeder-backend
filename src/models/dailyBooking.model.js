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
      ref: "Route",
    },

    routeNo: String,

    date: {
      type: Date,
      required: true,
    },

    pickupLocation: String,
    dropLocation: String,

    pickupSlot: String,
    dropSlot: String,

    // ⭐ Separate seats for pickup & drop
    pickupSeatNo: {
      type: Number,
      default: null,
    },
    dropSeatNo: {
      type: Number,
      default: null,
    },

    // ⭐ Separate boarding flags
    pickupBoarded: {
      type: Boolean,
      default: false,
    },
    dropBoarded: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["reserved", "boarded", "completed", "cancelled"],
      default: "reserved",
    },

    pickupBusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
    },
    dropBusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
    },
     // ⭐ Needed for linking to schedule
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusSchedule",
    },
      boarded: { type: Boolean, default: false },   // you probably already have this
  completed: { type: Boolean, default: false }, // when trip is fully done

  },
  { timestamps: true }
);

// Prevent duplicate for same user + date + slot
dailyBookingSchema.index(
  { userId: 1, date: 1, pickupSlot: 1, dropSlot: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["reserved"] } } }
);

export default mongoose.model("DailyBooking", dailyBookingSchema);
