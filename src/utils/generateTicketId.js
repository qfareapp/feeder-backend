// utils/generateTicketId.js
import Counter from "../models/Counter.js";
import Route from "../models/route.model.js";

export const generateTicketId = async (routeNo) => {
  // ✅ Check route exists
  const route = await Route.findOne({ routeNo });
  if (!route) {
    throw new Error(`Route ${routeNo} not found`);
  }

  // overall counter
  let overallCounter = await Counter.findOneAndUpdate(
    { key: "overall" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  // route-specific counter
  let routeCounter = await Counter.findOneAndUpdate(
    { key: routeNo },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  const overallSerial = overallCounter.value;
  const routeSerial = routeCounter.value;

  // formatted ticketId
  const ticketId = `${routeNo}-${String(routeSerial).padStart(3, "0")}-${String(overallSerial).padStart(5, "0")}`;

  // return everything needed by Pass schema
  return { ticketId, routeSerial, overallSerial };
};
