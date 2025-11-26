import mongoose from "mongoose";

const rideHistorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // basic trip info
    date: { type: Date, required: true },
    time: { type: String, required: true },      // slot, e.g. "08:30"
    tripType: { type: String, enum: ["pickup", "drop"], required: true },

    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },

    routeNo: { type: String },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route" },

    busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus" },
    busReg: { type: String },

    // optional booking info
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "DailyBooking" },
    seatNo: { type: String },

    // for debugging / analytics
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusSchedule",
    },
  },
  { timestamps: true }
);

export default mongoose.model("RideHistory", rideHistorySchema);
