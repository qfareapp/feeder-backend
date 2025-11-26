import express from "express";
import { getBuses, addBus,  getBusById,} from "../controllers/bus.controller.js";

const router = express.Router();

// ✅ Fetch all buses
router.get("/", getBuses);

// ✅ Onboard new bus (QR code auto-generated + driver password hashed)
router.post("/", addBus);
router.get("/:id", getBusById);

export default router;
