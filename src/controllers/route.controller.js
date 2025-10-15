import Route from "../models/route.model.js";

// ➡️ Get routes
export const getRoutes = async (req, res) => {
  try {
    const { from } = req.query;

    if (!from) {
      // return all routes if no pickup filter
      const routes = await Route.find();
      return res.json(routes);
    }

    // find routes that start from this pickup
    const routes = await Route.find({ startPoint: from });

    if (!routes.length) {
      return res.json([]); // no routes for this pickup
    }

    // build drop options: via stops + endpoint
    const dropOptions = routes.flatMap((route) => {
      const viaStops = route.stops || [];
      return [...viaStops, route.endPoint].map((loc, idx) => ({
  _id: `${route._id}-${idx}`,   // use index to guarantee uniqueness
  routeNo: route.routeNo,
  endPoint: String(loc),        // force clean string
  passAmount15: route.passAmount15,   // ✅ include pass amounts
        passAmount30: route.passAmount30,   // ✅ include pass amounts
}));
    });

    res.json(dropOptions);
  } catch (err) {
    console.error("Error fetching routes:", err.message);
    res.status(500).json({ message: err.message });
  }
};

// ➡️ Add route
export const addRoute = async (req, res) => {
  console.log("📦 Submitting route data:", req.body);
  try {
    const route = new Route(req.body);
    const saved = await route.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error adding route:", err.message);
    res.status(400).json({ message: err.message });
  }
};
// ➡️ Search routes by pickup + drop (return full route with tripSchedules)
export const searchRoutes = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "Both 'from' and 'to' are required" });
    }

    const routes = await Route.find();

    // filter for matching routes via stops
    const matchedRoutes = routes.filter((r) => {
      const stops = [r.startPoint, ...(r.stops || []), r.endPoint].map((s) =>
        s.toLowerCase().trim()
      );
      const fromIndex = stops.indexOf(from.toLowerCase().trim());
      const toIndex = stops.indexOf(to.toLowerCase().trim());
      return fromIndex !== -1 && toIndex !== -1 && fromIndex < toIndex;
    });

    res.json(matchedRoutes);
  } catch (err) {
    console.error("Error searching routes:", err.message);
    res.status(500).json({ message: err.message });
  }
};
// ➡️ Get single route by routeNo (with seats left)
export const getRouteByNo = async (req, res) => {
  try {
    const { routeNo } = req.params;
    const route = await Route.findOne({ routeNo });

    if (!route) {
      return res.status(404).json({ success: false, error: "Route not found" });
    }

    // calculate seats left dynamically
    const tripSchedules = route.tripSchedules.map((s) => ({
      ...s.toObject(),
      available: Math.max(0, s.seats - (s.booked || 0)),
    }));

    res.json({
      success: true,
      route: {
        ...route.toObject(),
        tripSchedules,
      },
    });
  } catch (err) {
    console.error("Error fetching route:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
// ✅ Update route
export const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Route.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, error: "Route not found" });
    }
    res.json({ success: true, route: updated });
  } catch (err) {
    console.error("Error updating route:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// ✅ Delete route
export const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Route.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Route not found" });
    }
    res.json({ success: true, message: "Route deleted" });
  } catch (err) {
    console.error("Error deleting route:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};