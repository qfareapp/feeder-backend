import mongoose from "mongoose";

const passSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    pickupLocation: { type: String, required: true },
    dropLocation: { type: String, required: true },
    pickupSlot: { type: String, required: true },
    dropSlot: { type: String, required: true },

    // 👇 calculated when booking
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date }, // set based on duration (15 or 30 days)

    durationDays: { type: Number, default: 30 }, // store plan length
    price: { type: Number, required: true }, // store selected price

    status: {
      type: String,
      enum: ["Active", "Expired"],
      default: "Active",
    },
      // 🎟️ Ticketing fields
      routeId: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    routeNo: { type: String, required: true }, // comes from Route.routeNo
    routeSerial: { type: Number, required: true }, // auto-increment per route
    overallSerial: { type: Number, required: true }, // global auto-increment
    ticketId: { type: String, unique: true, required: true }, // final format ROUTEID-RouteSerial-Overall

  },
  { timestamps: true }
);

export default mongoose.model("Pass", passSchema);
