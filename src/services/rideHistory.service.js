import DailyBooking from "../models/dailyBooking.model.js";
import RideHistory from "../models/rideHistory.model.js";
import BusSchedule from "../models/busSchedule.model.js";

/**
 * Create ride history entries for all boarded users in a completed schedule.
 */
export const createRideHistoryForSchedule = async (scheduleId) => {
  try {
    // 1️⃣ Fetch schedule (needed for bus + route)
    const schedule = await BusSchedule.findById(scheduleId);
    if (!schedule) return [];

    // 2️⃣ Fetch all bookings linked to this schedule
    const bookings = await DailyBooking.find({
      scheduleId,
      completed: false,     // so we don’t duplicate history
    });

    if (!bookings.length) return [];

    const historyEntries = [];

    for (const b of bookings) {
      // detect which trip type this schedule was for
      const tripType = schedule.tripType; // "pickup" or "drop"

      const slot =
        tripType === "pickup" ? b.pickupSlot : b.dropSlot;

      const seat =
        tripType === "pickup" ? b.pickupSeatNo : b.dropSeatNo;

      // 3️⃣ Create ride history document (MATCHES MODEL 100%)
      const entry = await RideHistory.create({
        user: b.userId,

        date: b.date,
        time: slot,
        tripType,

        pickupLocation: b.pickupLocation,
        dropLocation: b.dropLocation,

        routeNo: b.routeNo,
        routeId: b.routeId,

        busId: schedule.busId,
        busReg: schedule.busReg,

        bookingId: b._id,
        seatNo: seat,

        scheduleId: schedule._id,
      });

      historyEntries.push(entry);

      // 4️⃣ Mark booking completed
      b.completed = true;
      await b.save();
    }

    return { created: historyEntries.length, entries: historyEntries };

  } catch (err) {
    console.error("❌ Error creating ride history:", err);
    throw err;
  }
};
