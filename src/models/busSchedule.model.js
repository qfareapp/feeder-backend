import mongoose from "mongoose";

const busScheduleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },

    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    }, // <-- must exist

    slot: { type: String, required: true }, // trip time slot, e.g. "9:00 AM"

    tripType: {
      type: String,
      enum: ["pickup", "drop"], // ✅ NEW FIELD
      required: true,
    },

    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },

    societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society" },

    totalSeats: { type: Number },
    booked: { type: Number, default: 0 },

    // Trip lifecycle status
    status: {
      type: String,
      enum: ["Scheduled", "Active", "Trip Started", "Trip Completed", "Cancelled"],
      default: "Scheduled",
    },

    // ⏱️ timestamps for trip tracking
    startTime: { type: Date },
    endTime: { type: Date },
  },
  { timestamps: true } // also adds createdAt, updatedAt
);

export default mongoose.model("BusSchedule", busScheduleSchema);
