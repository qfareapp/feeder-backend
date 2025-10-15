import mongoose from "mongoose";

const tripScheduleSchema = new mongoose.Schema({
  slot: { type: String, required: true }, // e.g. "09:00"
  tripType: { type: String, enum: ["pickup", "drop"], required: true },
  seats: { type: Number, required: true },   // manual capacity
  booked: { type: Number, default: 0 },
  status: { type: String, enum: ["active", "inactive"], default: "active" }, // ✅
});

const routeSchema = new mongoose.Schema(
  {
    routeNo: { type: String, required: true },
    startPoint: { type: String, required: true },
    endPoint: { type: String, required: true },
    distanceKm: { type: Number, required: true },
    passAmount15: { type: Number, required: true },  // 15-day pass
    passAmount30: { type: Number, required: true },  // 30-day pass
    stops: [{ type: String }],  // dynamic array of via stops
    tripSchedules: [tripScheduleSchema], // ✅ use sub-schema
    active: { type: Boolean, default: true }, // route itself
    
  },
  { timestamps: true }
);

const Route = mongoose.model("Route", routeSchema);
export default Route;
