import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Routes
import societyRoutes from "./routes/society.routes.js";
import userRoutes from "./routes/user.routes.js";
import routeRoutes from "./routes/route.routes.js";
import busRoutes from "./routes/bus.routes.js";  // ✅ Added
import scheduleRoutes from "./routes/schedule.routes.js";
import driverAuthRoutes from "./routes/driverAuth.routes.js";
import passRoutes from "./routes/pass.routes.js";
import dailyRoutes from "./routes/daily.routes.js";
import boardingRoutes from "./routes/boarding.routes.js";

dotenv.config();

// Connect MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Admin Backend API is running ✅");
});

app.use("/api/societies", societyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/buses", busRoutes);  // ✅ Added
console.log("Mounting /api/schedules ...");
app.use("/api/schedules", scheduleRoutes);
app.use("/api/driver", driverAuthRoutes);
app.use("/api/passes", passRoutes);
app.use("/api/daily-bookings", dailyRoutes);
app.use("/api/boarding", boardingRoutes);

app.get("/ping", (req, res) => {
  res.json({ message: "pong ✅" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
