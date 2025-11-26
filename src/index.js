import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import connectDB from "./config/db.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// ✅ LOGGING: Now NODE_ENV will never be undefined
console.log(`🌍 Environment mode: ${process.env.NODE_ENV}`);
console.log(
  `📄 Loaded config from: ${
    process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.development"
  }`
);

// ✅ Connect MongoDB (auto-selects correct DB in db.js)
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ UPDATED: CORS setup (with Expo regex + local dev)
app.use(
  cors({
    origin: [
      "https://feeder-frontend-flame.vercel.app", // production frontend
      /\.expo\.dev$/,                             // all Expo subdomains
      "http://localhost:5173",                    // local dev frontend
      "exp://localhost:19000",                    // Expo Go local debug
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.send("Admin Backend API is running ✅");
});

import societyRoutes from "./routes/society.routes.js";
import userRoutes from "./routes/user.routes.js";
import routeRoutes from "./routes/route.routes.js";
import busRoutes from "./routes/bus.routes.js";
import scheduleRoutes from "./routes/schedule.routes.js";
import driverAuthRoutes from "./routes/driverAuth.routes.js";
import passRoutes from "./routes/pass.routes.js";
import dailyRoutes from "./routes/daily.routes.js";
import boardingRoutes from "./routes/boarding.routes.js";
import rideHistoryRoutes from "./routes/rideHistory.routes.js";
import driverResetRoutes from "./routes/driverReset.routes.js";


app.use("/api/societies", societyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/driver", driverAuthRoutes);
app.use("/api/passes", passRoutes);
app.use("/api/daily-bookings", dailyRoutes);
app.use("/api/boarding", boardingRoutes);
app.use("/api/rides", rideHistoryRoutes);
app.use("/api/driver", driverResetRoutes);

app.get("/ping", (req, res) => res.json({ message: "pong ✅" }));

// ✅ UPDATED: Show active port + color-coded environment
app.listen(PORT, "0.0.0.0", () => {
  const color =
    process.env.NODE_ENV === "production" ? "\x1b[33m" : "\x1b[32m"; // yellow for prod, green for dev
  console.log(
    `${color}🚀 Server running on http://0.0.0.0:${PORT} [${process.env.NODE_ENV}] \x1b[0m`
  );
});
